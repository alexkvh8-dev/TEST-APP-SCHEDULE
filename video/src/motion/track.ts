import {noise2D} from '@remotion/noise';
import {spring} from 'remotion';
import {BEZEL, CURSOR_FLOAT, LID_H, LID_TILT, LID_W} from '../config';
import {ACTIVE_FINAL, ACTIVE_START, BELL_BTN, NAV_ITEMS, NAV_ITEM_H, NAV_W, NAV_X, THEME_BTN, navIcon, navItemTop} from '../dashboard/layout';
import {EASE, clamp, invLerp, lerp, smoothDamp, smoothstep, wobble} from './math';
import {
	CLICK_T,
	RELEASE_T,
	type Pt,
	anticipationAt,
	bellRingAt,
	cursorAt,
	cursorPresence,
	pressAt,
} from './timeline';

export type V3 = [number, number, number];

export type Camera = {
	target: V3;
	dist: number;
	yaw: number; // degrees, + orbits to the laptop's left
	pitch: number; // degrees, + looks down from above
	roll: number;
};

export type FrameState = {
	t: number;
	cursor: Pt;
	velocity: Pt; // screen px / s
	presence: number;
	lift: number; // px above the glass
	scale: number;
	tilt: number; // degrees
	navHover: number[];
	themeHover: number;
	bellHover: number;
	bellRing: number;
	moonSpin: number;
	pillTop: number;
	pillStretch: number;
	activePop: number;
	crumb: number;
	ripple: number; // seconds since release (negative = not yet)
	cam: Camera;
};

const RAD = Math.PI / 180;

// Screen pixel (+ height above the glass) → world position. Mirrors the CSS:
// the lid hinges at the origin and leans back by LID_TILT.
export const displayToWorld = (u: number, v: number, h = 0): V3 => {
	const xl = -LID_W / 2 + BEZEL.left + u;
	const yl = -LID_H + BEZEL.top + v;
	const a = LID_TILT * RAD;
	return [xl, yl * Math.cos(a) - h * Math.sin(a), yl * Math.sin(a) + h * Math.cos(a)];
};

// World position → camera space; z is the distance in front of the lens.
export const toCamera = (p: V3, cam: Camera): V3 => {
	const x0 = p[0] - cam.target[0];
	const y0 = p[1] - cam.target[1];
	const z0 = p[2] - cam.target[2];
	const ya = cam.yaw * RAD;
	const x1 = x0 * Math.cos(ya) + z0 * Math.sin(ya);
	const z1 = -x0 * Math.sin(ya) + z0 * Math.cos(ya);
	const pa = -cam.pitch * RAD;
	const y2 = y0 * Math.cos(pa) - z1 * Math.sin(pa);
	const z2 = y0 * Math.sin(pa) + z1 * Math.cos(pa);
	return [x1, y2, cam.dist - z2];
};

const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const lerpCam = (a: Camera, b: Camera, t: number): Camera => ({
	target: lerp3(a.target, b.target, t),
	dist: lerp(a.dist, b.dist, t),
	yaw: lerp(a.yaw, b.yaw, t),
	pitch: lerp(a.pitch, b.pitch, t),
	roll: lerp(a.roll, b.roll, t),
});

const FINAL_ICON = navIcon(ACTIVE_FINAL);

// Where the camera *wants* to be. The rig then chases this with lag.
const desiredCamera = (t: number, cursor: Pt, speed: number, vx: number, focus: number): Camera => {
	// 1. Establishing orbit: sweep in from high on the right, down to the front.
	const pIntro = EASE.reveal(invLerp(0, 3.1, t));
	const intro = lerpCam(
		{target: [60, -330, 420], dist: 4600, yaw: -40, pitch: 25, roll: -5},
		{target: displayToWorld(800, 560), dist: 2450, yaw: 7, pitch: 9, roll: 0},
		pIntro,
	);

	// 2. Follow rig: drift toward the cursor and orbit to its side of the
	//    screen, easing out a little whenever the hand moves fast.
	const nx = (cursor.x - 800) / 800;
	const ny = (cursor.y - 500) / 500;
	const follow: Camera = {
		target: lerp3(displayToWorld(800, 500), displayToWorld(cursor.x, cursor.y), focus),
		dist: 1720 + 420 * smoothstep(150, 1500, speed),
		yaw: 5 - nx * 15,
		pitch: 8 + ny * 3.5,
		roll: clamp(vx / 1500, -1, 1) * 1.8,
	};

	// 3. Hero close-up after the click: slow push-in and orbit.
	const after = Math.max(0, t - RELEASE_T);
	const hero: Camera = {
		target: displayToWorld(FINAL_ICON.x + 96, FINAL_ICON.y + 8),
		dist: lerp(1120, 900, EASE.out(clamp(after / 2.8))),
		yaw: 24 + after * 1.6,
		pitch: 7 - after * 0.5,
		roll: 0,
	};

	const wFollow = EASE.inOut(invLerp(1.8, 3.7, t));
	const wHero = EASE.inOut(invLerp(10.5, 12.6, t));
	return lerpCam(lerpCam(intro, follow, wFollow), hero, wHero);
};

const hoverTargetNav = (p: Pt, i: number) => {
	const top = navItemTop(i);
	const dx = Math.max(NAV_X - p.x, 0, p.x - (NAV_X + NAV_W));
	const dy = Math.max(top - p.y, 0, p.y - (top + NAV_ITEM_H));
	return 1 - smoothstep(0, 5, Math.hypot(dx, dy));
};

const hoverTargetButton = (p: Pt, c: Pt) => 1 - smoothstep(18, 26, Math.hypot(p.x - c.x, p.y - c.y));

const cache = new Map<string, FrameState[]>();

export const getTrack = (fps: number, frames: number, aspect: number): FrameState[] => {
	const key = `${fps}:${frames}:${aspect}`;
	// Narrow frames show less of the screen, so the camera leans harder on the cursor.
	const focus = aspect < 1.5 ? 0.8 : 0.62;
	const hit = cache.get(key);
	if (hit) return hit;

	const out: FrameState[] = [];
	const dt = 1 / fps;
	const h = 0.5 / fps;

	// Smoothed channels
	let speedS = 0;
	let speedV = 0;
	let tiltS = 0;
	let tiltV = 0;
	const hoverS = NAV_ITEMS.map(() => 0);
	let themeS = 0;
	let bellS = 0;

	let cam: Camera | null = null;
	const camV = {t: [0, 0, 0] as V3, dist: 0, yaw: 0, pitch: 0, roll: 0};

	const pillFrom = navItemTop(ACTIVE_START);
	const pillTo = navItemTop(ACTIVE_FINAL);
	const releaseFrame = Math.round(RELEASE_T * fps);
	let prevPill = pillFrom;

	const approach = (cur: number, target: number, up: number, down: number) => {
		const tau = target > cur ? up : down;
		return cur + (target - cur) * (1 - Math.exp(-dt / tau));
	};

	for (let f = 0; f < frames; f++) {
		const t = f / fps;
		const cursor = cursorAt(t);
		const a = cursorAt(t - h);
		const b = cursorAt(t + h);
		const velocity = {x: (b.x - a.x) / (2 * h), y: (b.y - a.y) / (2 * h)};
		const speed = Math.hypot(velocity.x, velocity.y);

		[speedS, speedV] = smoothDamp(speedS, speed, speedV, 0.12, dt);
		[tiltS, tiltV] = smoothDamp(tiltS, clamp(velocity.x / 120, -8, 8), tiltV, 0.09, dt);

		const presence = cursorPresence(t);
		const live = presence > 0.5;
		NAV_ITEMS.forEach((_, i) => {
			hoverS[i] = approach(hoverS[i], live ? hoverTargetNav(cursor, i) : 0, 0.05, 0.16);
		});
		themeS = approach(themeS, live ? hoverTargetButton(cursor, THEME_BTN) : 0, 0.05, 0.16);
		bellS = approach(bellS, live ? hoverTargetButton(cursor, BELL_BTN) : 0, 0.05, 0.16);

		// Pill slides to the clicked item on release, stretching with speed.
		const pillP = spring({frame: f - releaseFrame, fps, config: {damping: 15, stiffness: 140, mass: 0.85}});
		const pillTop = lerp(pillFrom, pillTo, pillP);
		const pillStretch = Math.min(30, Math.abs(pillTop - prevPill) * 0.9);
		prevPill = pillTop;
		const activePop = 0.26 * wobble(t - RELEASE_T - 0.03, 2.4, 5);

		const press = pressAt(t);
		const lift =
			CURSOR_FLOAT * (1 - EASE.out(clamp(presence))) * 2.2 + // drops in from above
			CURSOR_FLOAT +
			16 * smoothstep(150, 1600, speedS) + // hand lifts when travelling
			10 * anticipationAt(t) -
			(CURSOR_FLOAT - 7) * press;
		const scale = lerp(0.55, 1, EASE.out(presence)) * (1 - 0.1 * clamp(press));

		// Camera rig: critically damped chase of the desired camera.
		const want = desiredCamera(t, cursor, speedS, velocity.x, focus);
		if (!cam) {
			cam = want;
		} else {
			const tgt: V3 = [0, 0, 0];
			for (let k = 0; k < 3; k++) {
				[tgt[k], camV.t[k]] = smoothDamp(cam.target[k], want.target[k], camV.t[k], 0.4, dt);
			}
			let dist: number;
			let yaw: number;
			let pitch: number;
			let roll: number;
			[dist, camV.dist] = smoothDamp(cam.dist, want.dist, camV.dist, 0.55, dt);
			[yaw, camV.yaw] = smoothDamp(cam.yaw, want.yaw, camV.yaw, 0.5, dt);
			[pitch, camV.pitch] = smoothDamp(cam.pitch, want.pitch, camV.pitch, 0.5, dt);
			[roll, camV.roll] = smoothDamp(cam.roll, want.roll, camV.roll, 0.35, dt);
			cam = {target: tgt, dist, yaw, pitch, roll};
		}

		// Handheld float layered on top so it never gets smoothed away.
		const shake = {
			yaw: noise2D('cam-yaw', t * 0.22, 0) * 0.45,
			pitch: noise2D('cam-pitch', t * 0.19, 5) * 0.3,
			roll: noise2D('cam-roll', t * 0.17, 9) * 0.25,
			x: noise2D('cam-x', t * 0.25, 2) * 5,
			y: noise2D('cam-y', t * 0.21, 7) * 4,
		};

		out.push({
			t,
			cursor,
			velocity,
			presence,
			lift,
			scale,
			tilt: tiltS,
			navHover: [...hoverS],
			themeHover: themeS,
			bellHover: bellS,
			bellRing: bellRingAt(t),
			moonSpin: -32 * themeS,
			pillTop,
			pillStretch,
			activePop,
			crumb: invLerp(RELEASE_T + 0.08, RELEASE_T + 0.55, t),
			ripple: t - CLICK_T,
			cam: {
				target: [cam.target[0] + shake.x, cam.target[1] + shake.y, cam.target[2]],
				dist: cam.dist,
				yaw: cam.yaw + shake.yaw,
				pitch: cam.pitch + shake.pitch,
				roll: cam.roll + shake.roll,
			},
		});
	}
	cache.set(key, out);
	return out;
};
