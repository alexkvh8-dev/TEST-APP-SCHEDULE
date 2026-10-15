import {noise2D} from '@remotion/noise';
import {BELL_BTN, THEME_BTN, navIcon} from '../dashboard/layout';
import {EASE, type Ease, clamp, invLerp, lerp, wobble} from './math';

export type Pt = {x: number; y: number};

// Fingertip lands just below-right of an icon's centre so the icon stays readable.
const onIcon = (p: Pt): Pt => ({x: p.x + 2, y: p.y + 3});
const nav = (i: number) => onIcon(navIcon(i));

type Segment = {
	to: Pt;
	start: number; // seconds
	dur: number;
	ease: Ease;
	arc: number; // sideways bulge as a fraction of the distance travelled
};

// Where the cursor fades in (screen pixels) and the beats of its tour.
export const APPEAR_AT: Pt = {x: 1140, y: 700};
export const APPEAR_T = 1.55;

export const SEGMENTS: Segment[] = [
	{to: nav(0), start: 2.0, dur: 1.0, ease: EASE.glide, arc: 0.16}, // Dashboard
	{to: nav(1), start: 3.32, dur: 0.34, ease: EASE.hop, arc: 0.06}, // Virtual Servers
	{to: nav(2), start: 3.88, dur: 0.3, ease: EASE.hop, arc: -0.05}, // Dedicated Servers
	{to: nav(3), start: 4.4, dur: 0.33, ease: EASE.hop, arc: 0.06}, // VPS Servers
	{to: nav(4), start: 4.96, dur: 0.3, ease: EASE.hop, arc: -0.05}, // Domain Names
	{to: nav(5), start: 5.52, dur: 0.44, ease: EASE.hop, arc: 0.07}, // Billing
	{to: onIcon(BELL_BTN), start: 6.32, dur: 1.05, ease: EASE.swoop, arc: -0.13}, // Notifications
	{to: onIcon(THEME_BTN), start: 7.86, dur: 0.34, ease: EASE.hop, arc: 0.25}, // Theme toggle
	{to: nav(6), start: 8.56, dur: 1.02, ease: EASE.swoop, arc: -0.12}, // Affiliate Program
	{to: nav(2), start: 9.92, dur: 0.92, ease: EASE.settle, arc: 0.2}, // ...and back: Dedicated Servers
];

export const CLICK_T = 11.06; // finger goes down
export const RELEASE_T = 11.18; // finger comes up, the UI responds
export const BELL_ARRIVE = SEGMENTS[6].start + SEGMENTS[6].dur;

const quad = (a: Pt, c: Pt, b: Pt, p: number): Pt => {
	const u = 1 - p;
	return {x: u * u * a.x + 2 * u * p * c.x + p * p * b.x, y: u * u * a.y + 2 * u * p * c.y + p * p * b.y};
};

const control = (a: Pt, b: Pt, arc: number): Pt => {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return {x: (a.x + b.x) / 2 - dy * arc, y: (a.y + b.y) / 2 + dx * arc};
};

// The authored path, before any hand tremor.
const pathAt = (t: number): Pt => {
	let from = APPEAR_AT;
	for (const s of SEGMENTS) {
		if (t < s.start) return from;
		if (t < s.start + s.dur) {
			return quad(from, control(from, s.to, s.arc), s.to, s.ease((t - s.start) / s.dur));
		}
		from = s.to;
	}
	return from;
};

// A living hand never holds perfectly still: a pixel of slow drift while
// hovering, calming right down once the final choice is made.
const tremor = (t: number): Pt => {
	const calm = lerp(1, 0.25, clamp((t - RELEASE_T) / 0.6));
	return {
		x: noise2D('tremor-x', t * 0.55, 0) * 1.4 * calm,
		y: noise2D('tremor-y', t * 0.5, 3) * 1.2 * calm,
	};
};

export const cursorAt = (t: number): Pt => {
	const p = pathAt(t);
	const n = tremor(t);
	return {x: p.x + n.x, y: p.y + n.y};
};

// 0 → 1 as the cursor fades in.
export const cursorPresence = (t: number) => EASE.out(invLerp(APPEAR_T, APPEAR_T + 0.55, t));

// How far the finger is pressed into the glass (0 = hovering, 1 = touching).
export const pressAt = (t: number) => {
	if (t < CLICK_T) return 0;
	if (t < CLICK_T + 0.07) return EASE.in(invLerp(CLICK_T, CLICK_T + 0.07, t));
	if (t < RELEASE_T) return 1;
	// Spring back up with a little overshoot.
	const r = t - RELEASE_T;
	return Math.max(-0.25, Math.exp(-r * 9) * Math.cos(r * 16));
};

// Anticipation: the finger lifts a touch right before it commits to the click.
export const anticipationAt = (t: number) => {
	const a = invLerp(CLICK_T - 0.24, CLICK_T - 0.04, t);
	return t < CLICK_T ? EASE.inOut(a) : 0;
};

export const bellRingAt = (t: number) => 16 * wobble(t - (BELL_ARRIVE - 0.12), 6.5, 3.2);
