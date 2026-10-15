import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {PERSPECTIVE_1080} from '../config';
import type {DashboardState} from '../dashboard/Dashboard';
import {getTrack} from '../motion/track';
import {Backdrop, Floor, Haze, Motes, Rocks} from './Environment';
import {Laptop} from './Laptop';
import {PostFX} from './PostFX';

export const Scene: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();
	const s = getTrack(fps, durationInFrames, width / height)[frame];

	// Same vertical field of view at any size; narrower frames pull the
	// camera back so the wide shots still hold the whole laptop.
	const P = PERSPECTIVE_1080 * (height / 1080);
	const aspect = width / height;
	const pullBack = aspect < 16 / 9 ? Math.pow(16 / 9 / aspect, 0.62) : 1;
	const cam = {...s.cam, dist: s.cam.dist * pullBack};
	const [tx, ty, tz] = cam.target;

	const dash: DashboardState = {
		t: s.t,
		navHover: s.navHover,
		themeHover: s.themeHover,
		bellHover: s.bellHover,
		bellRing: s.bellRing,
		moonSpin: s.moonSpin,
		pillTop: s.pillTop,
		pillStretch: s.pillStretch,
		activePop: s.activePop,
		crumb: s.crumb,
	};

	return (
		<AbsoluteFill style={{background: '#08090b'}}>
			<Backdrop cam={cam} width={width} height={height} perspective={P} />
			<AbsoluteFill style={{perspective: P, perspectiveOrigin: '50% 50%', overflow: 'hidden'}}>
				<div
					style={{
						position: 'absolute',
						left: '50%',
						top: '50%',
						width: 0,
						height: 0,
						transformStyle: 'preserve-3d',
						transform: `rotateZ(${cam.roll}deg) translateZ(${P - cam.dist}px) rotateX(${-cam.pitch}deg) rotateY(${cam.yaw}deg) translate3d(${-tx}px, ${-ty}px, ${-tz}px)`,
					}}
				>
					<Haze cam={cam} />
					<Floor />
					<Rocks cam={cam} />
					<Laptop s={{...s, cam}} dash={dash} />
					<Motes cam={cam} t={s.t} />
				</div>
			</AbsoluteFill>
			<PostFX frame={frame} durationInFrames={durationInFrames} fps={fps} />
		</AbsoluteFill>
	);
};
