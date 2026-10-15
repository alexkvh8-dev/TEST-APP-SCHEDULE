import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {EASE, invLerp, lerp} from '../motion/math';

const GRAIN = [0, 1, 2, 3].map((i) => staticFile(`grain-${i}.png`));

// Lens + film finish: vignette, a cool grade, animated grain, fades.
export const PostFX: React.FC<{frame: number; durationInFrames: number; fps: number}> = ({frame, durationInFrames, fps}) => {
	const t = frame / fps;
	const end = durationInFrames / fps;
	const fadeIn = EASE.out(invLerp(0, 0.6, t));
	const fadeOut = EASE.inOut(invLerp(end - 0.7, end, t));
	const black = lerp(1, 0, fadeIn) + fadeOut;
	// Grain jumps every other frame (24-30fps feel) at a random offset.
	const g = Math.floor(frame / 2);
	const ox = (g * 73) % 256;
	const oy = (g * 151) % 256;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<AbsoluteFill
				style={{
					background: 'radial-gradient(120% 95% at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%)',
				}}
			/>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(40,70,160,0.06), rgba(0,0,0,0) 40%, rgba(10,14,30,0.12))', mixBlendMode: 'soft-light'}} />
			<AbsoluteFill
				style={{
					backgroundImage: `url(${GRAIN[g % GRAIN.length]})`,
					backgroundPosition: `${ox}px ${oy}px`,
					mixBlendMode: 'overlay',
					opacity: 0.16,
				}}
			/>
			<AbsoluteFill style={{background: '#000', opacity: Math.min(1, black)}} />
		</AbsoluteFill>
	);
};
