import React from 'react';
import {Composition} from 'remotion';
import {DURATION_S, FPS} from './config';
import './fonts';
import {Scene} from './scene/Scene';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="LaptopCursor" component={Scene} durationInFrames={DURATION_S * FPS} fps={FPS} width={1920} height={1080} />
		<Composition id="LaptopCursorSquare" component={Scene} durationInFrames={DURATION_S * FPS} fps={FPS} width={1080} height={1080} />
	</>
);
