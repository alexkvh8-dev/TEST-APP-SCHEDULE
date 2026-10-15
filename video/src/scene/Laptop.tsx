import React from 'react';
import {BASE_D, BASE_T, BASE_W, BEZEL, LID_H, LID_T, LID_TILT, LID_W, SCREEN_H, SCREEN_W} from '../config';
import {Dashboard, type DashboardState} from '../dashboard/Dashboard';
import {EASE, invLerp} from '../motion/math';
import type {FrameState} from '../motion/track';
import {CursorLayer} from './Cursor';

const face = (w: number, h: number, transform: string, style: React.CSSProperties = {}): React.CSSProperties => ({
	position: 'absolute',
	left: 0,
	top: 0,
	width: w,
	height: h,
	transformOrigin: '0 0',
	transform,
	backfaceVisibility: 'hidden',
	...style,
});

const ALU_EDGE = 'linear-gradient(180deg, #5d6168, #3a3d42 60%, #2a2c30)';

// --- Keyboard deck ---------------------------------------------------------

const KB = {x: 250, y: 64, w: 1160, gap: 9};
const ROWS: {h: number; keys: number[]}[] = [
	{h: 34, keys: Array(14).fill(1)},
	{h: 62, keys: [...Array(13).fill(1), 1.5]},
	{h: 62, keys: [1.5, ...Array(13).fill(1)]},
	{h: 62, keys: [1.8, ...Array(11).fill(1), 1.8]},
	{h: 62, keys: [2.35, ...Array(10).fill(1), 2.35]},
	{h: 62, keys: [1, 1, 1, 1.3, 5.2, 1.3, 1, 1, 1, 1]},
];

const Keyboard: React.FC = () => {
	const keys: React.ReactNode[] = [];
	let y = KB.y + 14;
	ROWS.forEach((row, r) => {
		const units = row.keys.reduce((a, b) => a + b, 0);
		const unit = (KB.w - 28 - KB.gap * (row.keys.length - 1)) / units;
		let x = KB.x + 14;
		row.keys.forEach((k, i) => {
			const w = unit * k;
			keys.push(
				<g key={`${r}-${i}`}>
					<rect x={x} y={y} width={w} height={row.h} rx={8} fill="#0b0c0e" stroke="rgba(255,255,255,0.05)" />
					<rect x={x + 3} y={y + 2} width={w - 6} height={1.5} rx={0.75} fill="rgba(255,255,255,0.07)" />
				</g>,
			);
			x += w + KB.gap;
		});
		y += row.h + KB.gap;
	});
	const kbH = y - KB.y + 5;
	return (
		<svg width={BASE_W} height={BASE_D} style={{position: 'absolute', left: 0, top: 0}}>
			<defs>
				<pattern id="grille" width="9" height="9" patternUnits="userSpaceOnUse">
					<circle cx="4.5" cy="4.5" r="1.7" fill="#121315" />
				</pattern>
				<linearGradient id="pad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#30333a" />
					<stop offset="1" stopColor="#272a2f" />
				</linearGradient>
			</defs>
			<rect x={KB.x} y={KB.y} width={KB.w} height={kbH} rx={16} fill="#141518" stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
			{keys}
			<rect x={70} y={KB.y} width={150} height={kbH} rx={10} fill="url(#grille)" />
			<rect x={BASE_W - 220} y={KB.y} width={150} height={kbH} rx={10} fill="url(#grille)" />
			<rect x={(BASE_W - 660) / 2} y={KB.y + kbH + 52} width={660} height={430} rx={24} fill="url(#pad)" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
			<rect x={(BASE_W - 280) / 2} y={BASE_D - 22} width={280} height={30} rx={15} fill="rgba(0,0,0,0.35)" />
		</svg>
	);
};

const Base: React.FC<{glow: number}> = ({glow}) => (
	<>
		<div
			style={face(BASE_W, BASE_D, `translate3d(${-BASE_W / 2}px, 0px, 0px) rotateX(90deg)`, {
				borderRadius: '6px 6px 34px 34px',
				background: 'linear-gradient(180deg, #34373c 0%, #2c2f33 45%, #242629 100%)',
				boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.06)',
				overflow: 'hidden',
			})}
		>
			<Keyboard />
			{/* light from the screen falling on the deck */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: `linear-gradient(180deg, rgba(90,130,255,${0.2 * glow}), rgba(90,130,255,0) 38%)`,
				}}
			/>
		</div>
		<div
			style={face(BASE_W, BASE_T, `translate3d(${-BASE_W / 2}px, 0px, ${BASE_D}px)`, {
				borderRadius: '0 0 18px 18px',
				background: 'linear-gradient(180deg, #6b6f76, #3b3e43 35%, #1d1f22)',
			})}
		/>
		<div style={face(BASE_D, BASE_T, `translate3d(${-BASE_W / 2}px, 0px, 0px) rotateY(-90deg)`, {background: ALU_EDGE})} />
		<div style={face(BASE_D, BASE_T, `translate3d(${BASE_W / 2}px, 0px, ${BASE_D}px) rotateY(90deg)`, {background: ALU_EDGE})} />
	</>
);

// --- Lid ---------------------------------------------------------------------

const Lid: React.FC<{s: FrameState; dash: DashboardState; power: number}> = ({s, dash, power}) => {
	// The glass reflection slides as the camera orbits, like a real screen.
	const sheen = 50 + s.cam.yaw * 2.2 - s.cam.pitch * 1.2;
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `rotateX(${LID_TILT}deg)`}}>
			{/* back of the lid */}
			<div
				style={face(LID_W, LID_H, `translate3d(${LID_W / 2}px, ${-LID_H}px, ${-LID_T}px) rotateY(180deg)`, {
					borderRadius: '26px 26px 10px 10px',
					background: 'linear-gradient(160deg, #3b3e43, #26282c)',
				})}
			/>
			{/* edges */}
			<div style={face(LID_W, LID_T, `translate3d(${-LID_W / 2}px, ${-LID_H}px, ${-LID_T}px) rotateX(90deg)`, {background: ALU_EDGE})} />
			<div style={face(LID_T, LID_H, `translate3d(${-LID_W / 2}px, ${-LID_H}px, ${-LID_T}px) rotateY(-90deg)`, {background: 'linear-gradient(90deg, #4b4f55, #2c2e32)'})} />
			<div style={face(LID_T, LID_H, `translate3d(${LID_W / 2}px, ${-LID_H}px, 0px) rotateY(90deg)`, {background: 'linear-gradient(90deg, #4b4f55, #2c2e32)'})} />

			{/* front: bezel, display, glass */}
			<div style={{...face(LID_W, LID_H, `translate3d(${-LID_W / 2}px, ${-LID_H}px, 0px)`), transformStyle: 'preserve-3d'}}>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						borderRadius: '26px 26px 10px 10px',
						background: '#050506',
						boxShadow: `inset 0 0 0 2.5px #50545b, inset 0 0 0 5px #0a0a0b, 0 0 160px rgba(59,110,246,${0.22 * power})`,
					}}
				>
					<div
						style={{
							position: 'absolute',
							left: BEZEL.left,
							top: BEZEL.top,
							width: SCREEN_W,
							height: SCREEN_H,
							overflow: 'hidden',
							borderRadius: 10,
							background: '#020203',
						}}
					>
						<div style={{position: 'absolute', inset: 0, opacity: power}}>
							<Dashboard s={dash} />
						</div>
						<div
							style={{
								position: 'absolute',
								inset: 0,
								background: 'linear-gradient(112deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.075) 47%, rgba(255,255,255,0.02) 52%, rgba(255,255,255,0) 64%)',
								backgroundSize: '320% 100%',
								backgroundPosition: `${sheen}% 0`,
							}}
						/>
						<div
							style={{
								position: 'absolute',
								inset: 0,
								background: 'radial-gradient(130% 120% at 50% 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.28) 100%)',
							}}
						/>
					</div>
					{/* notch + camera */}
					<div
						style={{
							position: 'absolute',
							left: (LID_W - 200) / 2,
							top: 0,
							width: 200,
							height: BEZEL.top + 26,
							borderRadius: '0 0 14px 14px',
							background: '#050506',
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: 94,
								top: 22,
								width: 12,
								height: 12,
								borderRadius: 6,
								background: 'radial-gradient(circle at 35% 35%, #2c3550, #0b0d14 60%)',
							}}
						/>
					</div>
				</div>
				<CursorLayer s={s} />
			</div>
		</div>
	);
};

export const Laptop: React.FC<{s: FrameState; dash: DashboardState}> = ({s, dash}) => {
	const power = EASE.out(invLerp(0.15, 0.7, s.t));
	return (
		<div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d'}}>
			<Base glow={power} />
			<Lid s={s} dash={dash} power={power} />
		</div>
	);
};
