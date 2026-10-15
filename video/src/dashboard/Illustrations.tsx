import React from 'react';

// --- Flags (simplified, drawn so they do not depend on emoji fonts) ---------

const FlagFrame: React.FC<{children: React.ReactNode; id: string}> = ({children, id}) => (
	<svg width={22} height={15} viewBox="0 0 22 15" style={{display: 'block', flexShrink: 0}}>
		<defs>
			<clipPath id={id}>
				<rect width={22} height={15} rx={2.5} />
			</clipPath>
		</defs>
		<g clipPath={`url(#${id})`}>{children}</g>
		<rect width={22} height={15} rx={2.5} fill="none" stroke="rgba(255,255,255,0.12)" />
	</svg>
);

export const Flag: React.FC<{code: 'us' | 'uk' | 'de' | 'sg' | 'jp' | 'id'}> = ({code}) => {
	const id = `flag-${code}`;
	switch (code) {
		case 'us':
			return (
				<FlagFrame id={id}>
					<rect width={22} height={15} fill="#f5f5f5" />
					{[0, 2, 4, 6, 8, 10, 12].map((i) => (
						<rect key={i} y={(i * 15) / 13} width={22} height={15 / 13} fill="#c62b3c" />
					))}
					<rect width={9.5} height={8} fill="#2b3b80" />
				</FlagFrame>
			);
		case 'uk':
			return (
				<FlagFrame id={id}>
					<rect width={22} height={15} fill="#24317a" />
					<path d="M0 0 L22 15 M22 0 L0 15" stroke="#fff" strokeWidth={3} />
					<path d="M0 0 L22 15 M22 0 L0 15" stroke="#c8202f" strokeWidth={1.2} />
					<path d="M11 0 V15 M0 7.5 H22" stroke="#fff" strokeWidth={4.4} />
					<path d="M11 0 V15 M0 7.5 H22" stroke="#c8202f" strokeWidth={2.4} />
				</FlagFrame>
			);
		case 'de':
			return (
				<FlagFrame id={id}>
					<rect width={22} height={5} fill="#141414" />
					<rect y={5} width={22} height={5} fill="#d42a26" />
					<rect y={10} width={22} height={5} fill="#f6c330" />
				</FlagFrame>
			);
		case 'sg':
			return (
				<FlagFrame id={id}>
					<rect width={22} height={7.5} fill="#e0303a" />
					<rect y={7.5} width={22} height={7.5} fill="#f6f6f6" />
					<circle cx={5} cy={3.8} r={2.4} fill="#f6f6f6" />
					<circle cx={5.9} cy={3.8} r={2.2} fill="#e0303a" />
				</FlagFrame>
			);
		case 'jp':
			return (
				<FlagFrame id={id}>
					<rect width={22} height={15} fill="#f6f6f6" />
					<circle cx={11} cy={7.5} r={4} fill="#c8102e" />
				</FlagFrame>
			);
		case 'id':
		default:
			return (
				<FlagFrame id={id}>
					<rect width={22} height={7.5} fill="#e0303a" />
					<rect y={7.5} width={22} height={7.5} fill="#f6f6f6" />
				</FlagFrame>
			);
	}
};

// --- Isometric server illustrations ----------------------------------------

type V3 = [number, number, number];
const S = 1;
const project = ([x, y, z]: V3, ox: number, oy: number) =>
	`${(ox + (x - y) * 0.866 * S).toFixed(2)},${(oy + (x + y) * 0.5 * S - z * S).toFixed(2)}`;

type Shades = {top: string; left: string; right: string};

const BLUE: Shades = {top: 'url(#iso-top)', left: 'url(#iso-left)', right: 'url(#iso-right)'};
const DARK: Shades = {top: '#2a3141', left: '#171c27', right: '#10141c'};

const IsoBox: React.FC<{
	p: V3;
	size: V3;
	o: [number, number];
	shades?: Shades;
	stroke?: string;
}> = ({p: [x, y, z], size: [w, d, h], o: [ox, oy], shades = BLUE, stroke = 'rgba(160,190,255,0.35)'}) => {
	const P = (a: number, b: number, c: number) => project([a, b, c], ox, oy);
	return (
		<g strokeWidth={0.8} stroke={stroke} strokeLinejoin="round">
			<polygon fill={shades.left} points={`${P(x, y + d, z)} ${P(x + w, y + d, z)} ${P(x + w, y + d, z + h)} ${P(x, y + d, z + h)}`} />
			<polygon fill={shades.right} points={`${P(x + w, y, z)} ${P(x + w, y + d, z)} ${P(x + w, y + d, z + h)} ${P(x + w, y, z + h)}`} />
			<polygon fill={shades.top} points={`${P(x, y, z + h)} ${P(x + w, y, z + h)} ${P(x + w, y + d, z + h)} ${P(x, y + d, z + h)}`} />
		</g>
	);
};

const IsoDefs: React.FC = () => (
	<defs>
		<linearGradient id="iso-top" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stopColor="#8fb2ff" />
			<stop offset="1" stopColor="#4d7cf5" />
		</linearGradient>
		<linearGradient id="iso-left" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stopColor="#3a68ea" />
			<stop offset="1" stopColor="#1d3fb0" />
		</linearGradient>
		<linearGradient id="iso-right" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stopColor="#2448c4" />
			<stop offset="1" stopColor="#13287a" />
		</linearGradient>
		<radialGradient id="iso-glow">
			<stop offset="0" stopColor="rgba(80,130,255,0.55)" />
			<stop offset="1" stopColor="rgba(80,130,255,0)" />
		</radialGradient>
		<linearGradient id="iso-cyl" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stopColor="#1d3fb0" />
			<stop offset="0.45" stopColor="#3f6df0" />
			<stop offset="1" stopColor="#13287a" />
		</linearGradient>
	</defs>
);

const Leds: React.FC<{p: V3; w: number; o: [number, number]; on: number; t: number}> = ({p: [x, y, z], w, o, on, t}) => {
	const dots = [];
	for (let i = 0; i < on; i++) {
		const [sx, sy] = project([x + 8 + i * 7, y, z], o[0], o[1]).split(',').map(Number);
		const blink = 0.55 + 0.45 * Math.max(0, Math.sin(t * 5 + i * 1.7 + x));
		dots.push(<circle key={i} cx={sx} cy={sy} r={1.5} fill={i === 0 ? '#4ade80' : '#93c5fd'} opacity={blink} />);
	}
	const [ex, ey] = project([x + w - 10, y, z], o[0], o[1]).split(',').map(Number);
	const [fx, fy] = project([x + w - 30, y, z], o[0], o[1]).split(',').map(Number);
	return (
		<g>
			{dots}
			<line x1={fx} y1={fy} x2={ex} y2={ey} stroke="rgba(190,210,255,0.45)" strokeWidth={1.2} strokeLinecap="round" />
		</g>
	);
};

export const CloudServerArt: React.FC<{t: number}> = ({t}) => {
	const o: [number, number] = [120, 120];
	const float = Math.sin(t * 1.6) * 3;
	return (
		<svg width={240} height={190} viewBox="0 0 240 190">
			<IsoDefs />
			<ellipse cx={120} cy={150} rx={95} ry={30} fill="url(#iso-glow)" />
			<IsoBox p={[-60, -60, 0]} size={[120, 120, 8]} o={o} shades={DARK} stroke="rgba(120,150,230,0.25)" />
			<IsoBox p={[-40, -10, 8]} size={[44, 44, 34]} o={o} />
			<IsoBox p={[14, -38, 8]} size={[34, 34, 22]} o={o} />
			<g transform={`translate(0 ${float})`}>
				<g style={{filter: 'drop-shadow(0 0 10px rgba(90,140,255,0.8))'}}>
					<circle cx={108} cy={42} r={16} fill="#6f97ff" />
					<circle cx={128} cy={34} r={20} fill="#86a8ff" />
					<circle cx={148} cy={44} r={14} fill="#6f97ff" />
					<rect x={94} y={42} width={66} height={16} rx={8} fill="#6f97ff" />
				</g>
				<rect x={110} y={44} width={34} height={3} rx={1.5} fill="rgba(255,255,255,0.7)" />
			</g>
		</svg>
	);
};

export const DedicatedServerArt: React.FC<{t: number}> = ({t}) => {
	const o: [number, number] = [120, 118];
	const slabs = [0, 1, 2, 3];
	return (
		<svg width={240} height={190} viewBox="0 0 240 190">
			<IsoDefs />
			<ellipse cx={120} cy={150} rx={90} ry={28} fill="url(#iso-glow)" />
			<IsoBox p={[-50, -50, 0]} size={[100, 100, 6]} o={o} shades={DARK} stroke="rgba(120,150,230,0.25)" />
			{slabs.map((i) => (
				<g key={i}>
					<IsoBox p={[-30, -26, 6 + i * 19]} size={[62, 52, 15]} o={o} />
					<Leds p={[-30, 26, 6 + i * 19 + 7.5]} w={62} o={o} on={3} t={t + i} />
				</g>
			))}
		</svg>
	);
};

export const StorageServerArt: React.FC<{t: number}> = ({t}) => {
	const cx = 120;
	const rx = 44;
	const ry = 22;
	const disks = [0, 1, 2];
	return (
		<svg width={240} height={190} viewBox="0 0 240 190">
			<IsoDefs />
			<ellipse cx={120} cy={152} rx={92} ry={30} fill="url(#iso-glow)" />
			{disks.map((i) => {
				const yb = 140 - i * 34;
				const yt = yb - 24;
				const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
				return (
					<g key={i} stroke="rgba(160,190,255,0.35)" strokeWidth={0.8}>
						<path d={`M${cx - rx},${yt} L${cx - rx},${yb} A${rx},${ry} 0 0 0 ${cx + rx},${yb} L${cx + rx},${yt} Z`} fill="url(#iso-cyl)" />
						<ellipse cx={cx} cy={yt} rx={rx} ry={ry} fill="url(#iso-top)" />
						<ellipse cx={cx} cy={yt} rx={rx * 0.55} ry={ry * 0.55} fill="none" stroke="rgba(255,255,255,0.35)" />
						<circle cx={cx + rx * 0.62} cy={yb + 6} r={2} fill="#4ade80" opacity={0.4 + pulse * 0.6} stroke="none" />
					</g>
				);
			})}
		</svg>
	);
};
