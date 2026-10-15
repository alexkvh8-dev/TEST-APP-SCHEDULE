import React from 'react';
import {Img, staticFile, useVideoConfig} from 'remotion';
import {BEZEL, CURSOR_H, CURSOR_HOTSPOT, CURSOR_W, SCREEN_H, SCREEN_W} from '../config';
import {ACTIVE_FINAL, navIcon} from '../dashboard/layout';
import {EASE, clamp, invLerp} from '../motion/math';
import type {FrameState} from '../motion/track';

const SRC = staticFile('cursor-hand.png');
const CLICK_AT = {x: navIcon(ACTIVE_FINAL).x + 2, y: navIcon(ACTIVE_FINAL).y + 3};

const hand = (x: number, y: number, z: number, tilt: number, scale: number): React.CSSProperties => ({
	position: 'absolute',
	left: 0,
	top: 0,
	width: CURSOR_W,
	height: CURSOR_H,
	transformOrigin: `${CURSOR_HOTSPOT.x}px ${CURSOR_HOTSPOT.y}px`,
	transform: `translate3d(${x - CURSOR_HOTSPOT.x}px, ${y - CURSOR_HOTSPOT.y}px, ${z}px) rotate(${tilt}deg) scale(${scale})`,
});

const Ripple: React.FC<{age: number; delay: number; size: number}> = ({age, delay, size}) => {
	const p = invLerp(0, 0.6, age - delay);
	if (p <= 0 || p >= 1) return null;
	const r = size * EASE.out(p);
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: r * 2,
				height: r * 2,
				borderRadius: '50%',
				border: `${2.5 * (1 - p) + 0.5}px solid rgba(147,197,253,${0.95 * (1 - p)})`,
				background: `radial-gradient(circle, rgba(96,165,250,${0.25 * (1 - p)}), rgba(96,165,250,0) 70%)`,
				boxShadow: `0 0 ${18 * (1 - p)}px rgba(96,165,250,${0.6 * (1 - p)})`,
				transform: `translate3d(${CLICK_AT.x - r}px, ${CLICK_AT.y - r}px, 0.6px)`,
			}}
		/>
	);
};

// Lives inside the lid's 3D context so it floats a real distance above the
// glass: perspective, parallax and its own contact shadow all come for free.
export const CursorLayer: React.FC<{s: FrameState}> = ({s}) => {
	const {fps} = useVideoConfig();
	if (s.presence <= 0) return null;

	const {cursor, lift, tilt, scale, velocity, presence} = s;

	// Light comes from the upper left; the shadow tightens as the finger nears the glass.
	const shadowX = cursor.x + lift * 0.32;
	const shadowY = cursor.y + lift * 0.5;
	const shadowBlur = 1.5 + lift * 0.11;
	const shadowAlpha = clamp(0.62 - lift * 0.0045) * presence;

	// Motion blur: a few ghosts spread across a 180° shutter, only when moving.
	const shutter = 0.5 / fps;
	const travel = Math.hypot(velocity.x, velocity.y) * shutter;
	const ghosts = travel > 2.5 ? 5 : 0;

	return (
		<div
			style={{
				position: 'absolute',
				left: BEZEL.left,
				top: BEZEL.top,
				width: SCREEN_W,
				height: SCREEN_H,
				transformStyle: 'preserve-3d',
				pointerEvents: 'none',
			}}
		>
			<Ripple age={s.ripple} delay={0.1} size={44} />
			<Ripple age={s.ripple} delay={0.22} size={64} />
			<Img
				src={SRC}
				style={{
					...hand(shadowX, shadowY, 0.8, tilt, scale),
					filter: `brightness(0) blur(${shadowBlur}px)`,
					opacity: shadowAlpha,
				}}
			/>
			{Array.from({length: ghosts}, (_, i) => {
				const k = (i + 1) / ghosts;
				return (
					<Img
						key={i}
						src={SRC}
						style={{
							...hand(cursor.x - velocity.x * shutter * k, cursor.y - velocity.y * shutter * k, lift, tilt, scale),
							opacity: 0.26 * (1 - k * 0.5) * presence,
						}}
					/>
				);
			})}
			<Img
				src={SRC}
				style={{
					...hand(cursor.x, cursor.y, lift, tilt, scale),
					opacity: presence,
					filter: 'drop-shadow(0 1px 0.5px rgba(0,0,0,0.35))',
				}}
			/>
		</div>
	);
};
