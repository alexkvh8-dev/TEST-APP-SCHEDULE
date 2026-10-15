import React from 'react';
import {Img, random, staticFile} from 'remotion';
import {BASE_D, BASE_T, BASE_W} from '../config';
import {clamp} from '../motion/math';
import {type Camera, type V3, toCamera} from '../motion/track';

const FLOOR = 9000;
const RAD = Math.PI / 180;

// Ground around the laptop: lit by the screen, fading to transparent so it
// melts into the backdrop's horizon instead of showing an edge.
export const Floor: React.FC = () => (
	<>
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: FLOOR,
				height: FLOOR,
				transformOrigin: '0 0',
				transform: `translate3d(${-FLOOR / 2}px, ${BASE_T + 0.5}px, ${-FLOOR / 2 + 300}px) rotateX(90deg)`,
				background: [
					'radial-gradient(22% 16% at 50% 47%, rgba(70,110,230,0.22), rgba(70,110,230,0) 100%)',
					'radial-gradient(closest-side, rgba(30,32,38,1) 0%, rgba(20,22,26,0.95) 28%, rgba(13,14,17,0.75) 60%, rgba(11,12,14,0) 100%)',
				].join(', '),
			}}
		/>
		{/* contact shadow */}
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: BASE_W + 500,
				height: BASE_D + 500,
				transformOrigin: '0 0',
				transform: `translate3d(${-(BASE_W + 500) / 2}px, ${BASE_T - 0.5}px, -250px) rotateX(90deg)`,
				background: 'radial-gradient(closest-side, rgba(0,0,0,0.9) 62%, rgba(0,0,0,0) 100%)',
			}}
		/>
	</>
);

// A soft wash of screen light hanging in the air behind the laptop.
export const Haze: React.FC<{cam: Camera}> = ({cam}) => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			top: 0,
			width: 7000,
			height: 4200,
			transformOrigin: '0 0',
			transform: `translate3d(0px, -700px, -2600px) rotateY(${-cam.yaw}deg) translate(-50%, -50%)`,
			background: 'radial-gradient(closest-side, rgba(48,84,190,0.30), rgba(48,84,190,0.08) 55%, rgba(48,84,190,0) 100%)',
		}}
	/>
);

type Rock = {src: string; pos: V3; h: number; ratio: number; tone: number; flip?: boolean};

const ROCKS: Rock[] = [
	{src: 'rock-b-soft.png', pos: [-2700, BASE_T + 10, -2600], h: 1500, ratio: 886 / 817, tone: 0.55},
	{src: 'rock-c-soft.png', pos: [-700, BASE_T + 10, -4200], h: 1000, ratio: 626 / 614, tone: 0.45, flip: true},
	{src: 'rock-a.png', pos: [2250, BASE_T + 14, -1500], h: 1550, ratio: 1233 / 930, tone: 0.8},
	{src: 'rock-c.png', pos: [1700, BASE_T + 8, 650], h: 520, ratio: 626 / 614, tone: 0.85, flip: true},
	{src: 'rock-d.png', pos: [-1550, BASE_T + 6, 1050], h: 330, ratio: 555 / 441, tone: 0.8},
	{src: 'rock-d.png', pos: [1050, BASE_T + 4, 1600], h: 130, ratio: 555 / 441, tone: 0.75, flip: true},
	{src: 'rock-c.png', pos: [-1150, BASE_T + 4, -650], h: 240, ratio: 626 / 614, tone: 0.7},
];

// Rocks are upright cards that turn to face the camera (cylindrical
// billboards), so they read as solid boulders from every angle.
export const Rocks: React.FC<{cam: Camera}> = ({cam}) => (
	<>
		{ROCKS.map((r, i) => {
			const w = r.h * r.ratio;
			return (
				<div
					key={`shadow-${i}`}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: w * 1.1,
						height: w * 0.7,
						transformOrigin: '0 0',
						transform: `translate3d(${r.pos[0] - w * 0.55}px, ${BASE_T - 0.2}px, ${r.pos[2] - w * 0.35}px) rotateX(90deg)`,
						background: 'radial-gradient(closest-side, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0) 100%)',
					}}
				/>
			);
		})}
		{ROCKS.map((r, i) => {
			const w = r.h * r.ratio;
			return (
				<Img
					key={i}
					src={staticFile(r.src)}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: w,
						height: r.h,
						transformOrigin: '0 0',
						transform: `translate3d(${r.pos[0]}px, ${r.pos[1]}px, ${r.pos[2]}px) rotateY(${-cam.yaw}deg) translate(${-w / 2}px, ${-r.h}px)${r.flip ? ' scaleX(-1)' : ''}`,
						filter: `brightness(${r.tone})`,
					}}
				/>
			);
		})}
	</>
);

type Mote = {p: V3; size: number; phase: number; speed: number; alpha: number};

const MOTES: Mote[] = (() => {
	const out: Mote[] = [];
	let i = 0;
	while (out.length < 90) {
		i++;
		const p: V3 = [
			(random(`mx${i}`) - 0.5) * 7600,
			-60 - random(`my${i}`) * 2600,
			-4200 + random(`mz${i}`) * 5400,
		];
		// Keep the space directly in front of the screen clear.
		const inFront = Math.abs(p[0]) < 1050 && p[2] > -400 && p[1] > -1300;
		if (inFront) continue;
		out.push({p, size: 4 + random(`ms${i}`) * 9, phase: random(`mp${i}`) * 100, speed: 0.4 + random(`mv${i}`), alpha: 0.25 + random(`ma${i}`) * 0.55});
	}
	return out;
})();

// Floating dust: the strongest parallax cue in the frame, with a cheap
// depth-of-field (out-of-focus motes grow and fade instead of blurring).
export const Motes: React.FC<{cam: Camera; t: number}> = ({cam, t}) => (
	<>
		{MOTES.map((m, i) => {
			const p: V3 = [
				m.p[0] + Math.sin(t * 0.35 * m.speed + m.phase) * 40,
				m.p[1] - t * 14 * m.speed + Math.sin(t * 0.5 + m.phase) * 12,
				m.p[2] + Math.cos(t * 0.3 * m.speed + m.phase) * 40,
			];
			const depth = toCamera(p, cam)[2];
			if (depth < 180) return null;
			const coc = Math.min(70, (Math.abs(depth - cam.dist) / depth) * 38);
			const size = m.size + coc;
			const alpha = m.alpha * clamp(Math.pow(m.size / size, 1.1) * 1.3) * clamp((depth - 180) / 400);
			return (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: size,
						height: size,
						borderRadius: '50%',
						background: `radial-gradient(circle, rgba(200,215,255,${alpha}) 0%, rgba(170,195,255,${alpha * 0.55}) 45%, rgba(150,180,255,0) 72%)`,
						transform: `translate3d(${p[0]}px, ${p[1]}px, ${p[2]}px) rotateY(${-cam.yaw}deg) rotateX(${cam.pitch}deg) translate(-50%, -50%)`,
					}}
				/>
			);
		})}
	</>
);

// Far backdrop (at infinity): a horizon that tracks the camera's pitch and
// roll, with distant glows that slide with yaw.
export const Backdrop: React.FC<{cam: Camera; width: number; height: number; perspective: number}> = ({cam, width, height, perspective}) => {
	const horizon = height / 2 - perspective * Math.tan(cam.pitch * RAD);
	const shift = -perspective * Math.tan(cam.yaw * RAD);
	const W = width * 4;
	const H = height * 4;
	return (
		<div style={{position: 'absolute', inset: 0, background: '#08090b', overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					left: width / 2 - W / 2,
					top: horizon - H / 2,
					width: W,
					height: H,
					transformOrigin: `50% 50%`,
					transform: `rotate(${cam.roll}deg)`,
					background: [
						// horizon haze
						`linear-gradient(180deg, rgba(0,0,0,0) 44%, rgba(36,52,96,0.35) 49.6%, rgba(16,20,30,0.5) 50.4%, rgba(0,0,0,0) 56%)`,
						// distant glows, parked at infinity
						`radial-gradient(9% 8% at calc(50% + ${shift * 0.9 + width * 0.55}px) 46%, rgba(90,70,190,0.16), rgba(90,70,190,0) 100%)`,
						`radial-gradient(10% 7% at calc(50% + ${shift - width * 0.7}px) 47%, rgba(40,90,200,0.14), rgba(40,90,200,0) 100%)`,
						// sky above, ground below
						`linear-gradient(180deg, #050608 0%, #080a0e 38%, #0e1118 49.5%, #0c0d10 50.5%, #09090b 62%, #060607 100%)`,
					].join(', '),
				}}
			/>
		</div>
	);
};
