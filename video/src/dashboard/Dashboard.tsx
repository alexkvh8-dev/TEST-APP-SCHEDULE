import {ArrowRight, Bell, ChevronDown, ChevronLeft, Ellipsis, Gift, Moon, Plus, Sparkles, Ticket} from 'lucide-react';
import React from 'react';
import {SCREEN_H, SCREEN_W} from '../config';
import {FONT, MONO} from '../fonts';
import {EASE, clamp, invLerp, mixHex} from '../motion/math';
import {CloudServerArt, DedicatedServerArt, Flag, StorageServerArt} from './Illustrations';
import {
	AVATAR,
	BELL_BTN,
	CONTENT_R,
	CONTENT_X,
	HEADER_BTN,
	HEADER_H,
	NAV_GROUPS,
	NAV_ITEMS,
	NAV_ITEM_H,
	NAV_STEP,
	NAV_W,
	NAV_X,
	SIDEBAR_W,
	THEME_BTN,
	groupLabelTop,
	navItemTop,
} from './layout';

export const C = {
	bg: '#0b0d11',
	sidebar: '#0e1014',
	panel: '#12151a',
	panelHi: '#161a20',
	line: 'rgba(255,255,255,0.06)',
	lineHi: 'rgba(255,255,255,0.1)',
	text: '#eef0f4',
	muted: '#7b818c',
	dim: '#4c525d',
	accent: '#3b82f6',
	accentHi: '#60a5fa',
	green: '#22c55e',
	red: '#ef4444',
	amber: '#f59e0b',
};

export type DashboardState = {
	t: number;
	navHover: number[];
	themeHover: number;
	bellHover: number;
	bellRing: number; // degrees
	moonSpin: number; // degrees
	pillTop: number;
	pillStretch: number;
	activePop: number; // extra icon scale on the newly active item
	crumb: number; // 0 = Overview, 1 = Dedicated Servers
};

// Staggered boot-up: each block rises into place a beat after the last.
const rise = (t: number, delay: number, distance = 16): React.CSSProperties => {
	const p = EASE.out(invLerp(delay, delay + 0.7, t));
	return {opacity: p, transform: `translateY(${(1 - p) * distance}px)`};
};

const BOOT = 0.35; // seconds: when the screen wakes up

const Panel: React.FC<{style: React.CSSProperties; children?: React.ReactNode}> = ({style, children}) => (
	<div
		style={{
			position: 'absolute',
			background: C.panel,
			border: `1px solid ${C.line}`,
			borderRadius: 16,
			overflow: 'hidden',
			...style,
		}}
	>
		{children}
	</div>
);

const Badge: React.FC<{tone: 'green' | 'red' | 'amber' | 'gray'; children: React.ReactNode}> = ({tone, children}) => {
	const color = {green: C.green, red: C.red, amber: C.amber, gray: C.muted}[tone];
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				padding: '4px 10px',
				borderRadius: 999,
				fontSize: 11.5,
				fontWeight: 600,
				color,
				background: `${color}1f`,
				border: `1px solid ${color}33`,
			}}
		>
			<span style={{width: 6, height: 6, borderRadius: 3, background: color}} />
			{children}
		</span>
	);
};

// ---------------------------------------------------------------------------

const Sidebar: React.FC<{s: DashboardState}> = ({s}) => {
	const {t} = s;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: SIDEBAR_W,
				height: SCREEN_H,
				background: C.sidebar,
				borderRight: `1px solid ${C.line}`,
			}}
		>
			{/* Logo */}
			<div style={{position: 'absolute', left: 24, top: 22, display: 'flex', alignItems: 'center', gap: 12, ...rise(t, BOOT)}}>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: 11,
						background: 'linear-gradient(135deg, #60a5fa, #2563eb 55%, #4338ca)',
						boxShadow: '0 6px 18px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.35)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<svg width={20} height={20} viewBox="0 0 24 24">
						<path d="M5 8.5 12 4l7 4.5-7 4.5z" fill="#fff" />
						<path d="M5 12.5 12 17l7-4.5" fill="none" stroke="#fff" strokeWidth={2} strokeLinejoin="round" opacity={0.75} />
						<path d="M5 16 12 20.5 19 16" fill="none" stroke="#fff" strokeWidth={2} strokeLinejoin="round" opacity={0.45} />
					</svg>
				</div>
				<span style={{fontSize: 21, fontWeight: 800, letterSpacing: 2.5, color: C.text}}>SNOKU</span>
			</div>

			{NAV_GROUPS.map((g, gi) => (
				<div
					key={g}
					style={{
						position: 'absolute',
						left: NAV_X + 14,
						top: groupLabelTop(gi) + 6,
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: 1.4,
						textTransform: 'uppercase',
						color: C.dim,
						...rise(t, BOOT + 0.1 + gi * 0.12),
					}}
				>
					{g}
				</div>
			))}

			{/* Active pill: slides (and stretches) to the clicked item */}
			<div
				style={{
					position: 'absolute',
					left: NAV_X,
					top: s.pillTop - s.pillStretch / 2,
					width: NAV_W,
					height: NAV_ITEM_H + s.pillStretch,
					borderRadius: 12,
					background: 'linear-gradient(90deg, rgba(59,130,246,0.24), rgba(59,130,246,0.07))',
					border: '1px solid rgba(96,165,250,0.28)',
					boxShadow: '0 8px 24px rgba(37,99,235,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
					...rise(t, BOOT + 0.15),
				}}
			>
				<div
					style={{
						position: 'absolute',
						left: -1,
						top: '22%',
						width: 3,
						height: '56%',
						borderRadius: 3,
						background: C.accentHi,
						boxShadow: '0 0 10px rgba(96,165,250,0.9)',
					}}
				/>
			</div>

			{NAV_ITEMS.map((item, i) => {
				const top = navItemTop(i);
				const h = s.navHover[i] ?? 0;
				const active = clamp(1 - Math.abs(s.pillTop - top) / NAV_STEP);
				const lit = Math.max(h, active);
				const iconColor = active > 0.5 ? mixHex('#ffffff', '#93c5fd', active) : mixHex('#7b818c', '#ffffff', lit);
				const pop = active > 0.5 ? s.activePop : 0;
				const {Icon} = item;
				return (
					<div
						key={item.label}
						style={{
							position: 'absolute',
							left: NAV_X,
							top,
							width: NAV_W,
							height: NAV_ITEM_H,
							borderRadius: 12,
							background: `rgba(255,255,255,${0.055 * h * (1 - active)})`,
							display: 'flex',
							alignItems: 'center',
							gap: 13,
							paddingLeft: 16,
							...rise(t, BOOT + 0.2 + i * 0.055, 10),
						}}
					>
						<div style={{transform: `translateX(${h * 3}px) scale(${1 + 0.14 * h + pop})`, display: 'flex'}}>
							<Icon size={20} strokeWidth={1.9} color={iconColor} />
						</div>
						<span
							style={{
								fontSize: 14.5,
								fontWeight: active > 0.5 ? 600 : 500,
								color: mixHex('#9aa0aa', '#ffffff', lit),
								transform: `translateX(${h * 3}px)`,
								whiteSpace: 'nowrap',
							}}
						>
							{item.label}
						</span>
						{i === 1 ? (
							<span
								style={{
									marginLeft: 'auto',
									marginRight: 12,
									fontSize: 10.5,
									fontWeight: 700,
									color: '#bfdbfe',
									background: 'rgba(59,130,246,0.22)',
									borderRadius: 6,
									padding: '2px 7px',
								}}
							>
								NEW
							</span>
						) : null}
					</div>
				);
			})}

			{/* Storage card */}
			<div
				style={{
					position: 'absolute',
					left: 16,
					right: 16,
					top: 790,
					padding: 18,
					borderRadius: 16,
					background: 'linear-gradient(160deg, #151a24, #10131a)',
					border: `1px solid ${C.line}`,
					...rise(t, BOOT + 0.8),
				}}
			>
				<div style={{display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontSize: 13.5, fontWeight: 600}}>
					<Sparkles size={16} color="#93c5fd" /> Storage
				</div>
				<div style={{marginTop: 6, fontSize: 12, color: C.muted}}>68.4 GB of 100 GB used</div>
				<div style={{marginTop: 12, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)'}}>
					<div
						style={{
							width: `${68.4 * EASE.out(invLerp(BOOT + 0.9, BOOT + 2, t))}%`,
							height: '100%',
							borderRadius: 3,
							background: 'linear-gradient(90deg, #3b82f6, #818cf8)',
						}}
					/>
				</div>
				<div
					style={{
						marginTop: 16,
						height: 38,
						borderRadius: 10,
						background: 'rgba(255,255,255,0.06)',
						border: `1px solid ${C.lineHi}`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 13,
						fontWeight: 600,
						color: C.text,
					}}
				>
					Upgrade Plan
				</div>
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------

const IconButton: React.FC<{
	c: {x: number; y: number};
	hover: number;
	children: React.ReactNode;
	tooltip: string;
	t: number;
	delay: number;
}> = ({c, hover, children, tooltip, t, delay}) => (
	<>
		<div
			style={{
				position: 'absolute',
				left: c.x - HEADER_BTN / 2,
				top: c.y - HEADER_BTN / 2,
				width: HEADER_BTN,
				height: HEADER_BTN,
				borderRadius: 12,
				background: `rgba(255,255,255,${0.04 + 0.08 * hover})`,
				border: `1px solid rgba(255,255,255,${0.07 + 0.1 * hover})`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				transform: `scale(${1 + 0.06 * hover})`,
				...rise(t, delay),
			}}
		>
			{children}
		</div>
		<div
			style={{
				position: 'absolute',
				// Right-aligned to the left of the fingertip so the hand never covers it.
				left: c.x - 26,
				top: c.y + 28,
				transform: `translate(-100%, ${(1 - hover) * -6}px)`,
				opacity: hover,
				padding: '6px 10px',
				borderRadius: 8,
				background: '#f4f6fa',
				color: '#0b0d11',
				fontSize: 12,
				fontWeight: 600,
				whiteSpace: 'nowrap',
				boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
				zIndex: 5,
			}}
		>
			{tooltip}
		</div>
	</>
);

const Header: React.FC<{s: DashboardState}> = ({s}) => {
	const {t} = s;
	const crumbP = EASE.inOut(clamp(s.crumb));
	const crumb = (a: string, b: string, p: number, dir: number) => (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				display: 'flex',
				gap: 8,
				fontSize: 15,
				whiteSpace: 'nowrap',
				opacity: p,
				transform: `translateY(${(1 - p) * 12 * dir}px)`,
			}}
		>
			<span style={{color: C.muted, fontWeight: 500}}>{a}</span>
			<span style={{color: C.dim}}>/</span>
			<span style={{color: C.text, fontWeight: 600}}>{b}</span>
		</div>
	);
	return (
		<div
			style={{
				position: 'absolute',
				left: SIDEBAR_W,
				top: 0,
				right: 0,
				height: HEADER_H,
				borderBottom: `1px solid ${C.line}`,
				background: 'rgba(11,13,17,0.85)',
			}}
		>
			<div style={{position: 'absolute', inset: 0, transform: `translateX(${-SIDEBAR_W}px)`}}>
				<div
					style={{
						position: 'absolute',
						left: CONTENT_X,
						top: 20,
						width: 32,
						height: 32,
						borderRadius: 10,
						border: `1px solid ${C.lineHi}`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						...rise(t, BOOT + 0.2),
					}}
				>
					<ChevronLeft size={18} color={C.muted} />
				</div>
				<div style={{position: 'absolute', left: CONTENT_X + 46, top: 26, height: 22, width: 400, ...rise(t, BOOT + 0.25)}}>
					{crumb('Dashboard', 'Overview', 1 - crumbP, -1)}
					{crumb('Servers', 'Dedicated Servers', crumbP, 1)}
				</div>

				<div
					style={{
						position: 'absolute',
						left: 1192,
						top: 16,
						width: 110,
						height: 40,
						borderRadius: 12,
						border: `1px solid ${C.lineHi}`,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 6,
						fontSize: 14,
						fontWeight: 600,
						color: C.text,
						...rise(t, BOOT + 0.3),
					}}
				>
					<span style={{color: C.muted}}>$</span>248.00
					<ChevronDown size={15} color={C.muted} />
				</div>
				<div
					style={{
						position: 'absolute',
						left: 1312,
						top: 16,
						width: 104,
						height: 40,
						borderRadius: 12,
						background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
						boxShadow: '0 6px 16px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 6,
						fontSize: 14,
						fontWeight: 600,
						color: '#fff',
						...rise(t, BOOT + 0.35),
					}}
				>
					<Plus size={16} strokeWidth={2.4} /> Deposit
				</div>

				<IconButton c={THEME_BTN} hover={s.themeHover} tooltip="Dark mode" t={t} delay={BOOT + 0.4}>
					<div style={{transform: `rotate(${s.moonSpin}deg)`, display: 'flex'}}>
						<Moon size={18} color={mixHex('#9aa0aa', '#ffffff', s.themeHover)} fill={s.themeHover > 0.05 ? `rgba(255,255,255,${0.9 * s.themeHover})` : 'none'} />
					</div>
				</IconButton>
				<IconButton c={BELL_BTN} hover={s.bellHover} tooltip="3 new notifications" t={t} delay={BOOT + 0.45}>
					<div style={{transform: `rotate(${s.bellRing}deg)`, transformOrigin: '50% 10%', display: 'flex'}}>
						<Bell size={18} color={mixHex('#9aa0aa', '#ffffff', s.bellHover)} />
					</div>
					<div
						style={{
							position: 'absolute',
							right: 9,
							top: 8,
							width: 8,
							height: 8,
							borderRadius: 4,
							background: C.red,
							boxShadow: `0 0 0 2px ${C.bg}, 0 0 ${6 + 8 * s.bellHover}px rgba(239,68,68,0.8)`,
						}}
					/>
				</IconButton>
				<div
					style={{
						position: 'absolute',
						left: AVATAR.x - 19,
						top: AVATAR.y - 19,
						width: 38,
						height: 38,
						borderRadius: 19,
						background: 'linear-gradient(135deg, #f59e0b, #ef4444 60%, #a855f7)',
						border: '2px solid rgba(255,255,255,0.15)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 13,
						fontWeight: 700,
						color: '#fff',
						...rise(t, BOOT + 0.5),
					}}
				>
					AK
				</div>
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------

const Hero: React.FC<{t: number}> = ({t}) => {
	const top = 92;
	const h = 220;
	const bannerW = 1018;
	const glow = 0.85 + 0.15 * Math.sin(t * 1.4);
	const stars = Array.from({length: 26}, (_, i) => ({
		x: (i * 389) % bannerW,
		y: (i * 157) % h,
		r: 0.6 + ((i * 7) % 5) * 0.25,
		tw: 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i * 2.1)),
	}));
	return (
		<>
			<Panel
				style={{
					left: CONTENT_X,
					top,
					width: bannerW,
					height: h,
					background:
						'radial-gradient(120% 140% at 42% 120%, rgba(37,99,235,0.45), rgba(37,99,235,0) 55%), linear-gradient(135deg, #0b1122, #06080f 70%)',
					...rise(t, BOOT + 0.3, 24),
				}}
			>
				{stars.map((st, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: st.x,
							top: st.y,
							width: st.r * 2,
							height: st.r * 2,
							borderRadius: '50%',
							background: '#cfe0ff',
							opacity: st.tw * 0.7,
						}}
					/>
				))}
				{/* perspective grid floor */}
				<div
					style={{
						position: 'absolute',
						left: -200,
						right: -200,
						bottom: -40,
						height: 140,
						backgroundImage:
							'linear-gradient(rgba(96,165,250,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.18) 1px, transparent 1px)',
						backgroundSize: '44px 22px',
						backgroundPosition: `${(t * 18) % 44}px 0`,
						transform: 'perspective(260px) rotateX(58deg)',
						transformOrigin: '50% 100%',
						maskImage: 'linear-gradient(to top, black, transparent)',
						WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
					}}
				/>
				{/* planet */}
				<div
					style={{
						position: 'absolute',
						left: 330,
						top: 34,
						width: 250,
						height: 250,
						borderRadius: '50%',
						background:
							'radial-gradient(circle at 34% 28%, #b9d0ff 0%, #5f8dff 14%, #2549d8 38%, #0e1d6b 64%, #050a24 82%)',
						boxShadow: `0 0 ${70 * glow}px rgba(59,130,246,${0.55 * glow}), inset -18px -24px 50px rgba(0,0,0,0.65)`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: 250,
						top: 128,
						width: 410,
						height: 92,
						borderRadius: '50%',
						border: '1.5px solid rgba(147,197,253,0.45)',
						transform: 'rotate(-12deg)',
						boxShadow: '0 0 18px rgba(96,165,250,0.35)',
					}}
				/>
				<div style={{position: 'absolute', left: 40, top: 40, color: '#fff', fontWeight: 900, lineHeight: 0.95, letterSpacing: -1}}>
					<div style={{fontSize: 66}}>BLACK</div>
					<div
						style={{
							fontSize: 66,
							color: 'transparent',
							WebkitTextStroke: '1.6px rgba(255,255,255,0.9)',
						}}
					>
						FRIDAY
					</div>
				</div>
				<div style={{position: 'absolute', left: 42, top: 178, fontSize: 13, color: '#93a4c3', width: 300}}>
					Up to 40% off all hosting plans · this week only
				</div>
				<div style={{position: 'absolute', left: 700, top: 34, color: '#fff'}}>
					<div style={{fontSize: 12, fontWeight: 700, letterSpacing: 5, color: '#93c5fd'}}>BIG SALE</div>
					<div style={{fontSize: 13, fontWeight: 600, letterSpacing: 3, marginTop: 14, color: '#c7d2fe'}}>UP TO</div>
					<div
						style={{
							fontSize: 92,
							fontWeight: 800,
							letterSpacing: -3,
							lineHeight: 1,
							background: 'linear-gradient(180deg, #ffffff, #93c5fd)',
							WebkitBackgroundClip: 'text',
							color: 'transparent',
						}}
					>
						40%
					</div>
					<div style={{fontSize: 15, fontWeight: 700, letterSpacing: 8, marginTop: 4}}>OFF</div>
				</div>
			</Panel>

			<Panel
				style={{
					left: CONTENT_X + bannerW + 16,
					top,
					width: CONTENT_R - (CONTENT_X + bannerW + 16),
					height: h,
					background: 'linear-gradient(155deg, #3b82f6 0%, #1d4ed8 40%, #172554 100%)',
					border: '1px solid rgba(147,197,253,0.35)',
					...rise(t, BOOT + 0.4, 24),
				}}
			>
				<div
					style={{
						position: 'absolute',
						right: -40,
						top: -40,
						width: 160,
						height: 160,
						borderRadius: '50%',
						background: 'radial-gradient(circle, rgba(255,255,255,0.28), rgba(255,255,255,0) 70%)',
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: 20,
						top: 20,
						width: 46,
						height: 46,
						borderRadius: 14,
						background: 'rgba(255,255,255,0.16)',
						border: '1px solid rgba(255,255,255,0.3)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transform: `translateY(${Math.sin(t * 2) * 2}px)`,
					}}
				>
					<Gift size={22} color="#fff" />
				</div>
				<div style={{position: 'absolute', left: 20, top: 82, color: '#fff', fontSize: 18, fontWeight: 700}}>Refer and Earn</div>
				<div style={{position: 'absolute', left: 20, top: 110, right: 18, color: 'rgba(255,255,255,0.72)', fontSize: 12.5, lineHeight: 1.45}}>
					Invite friends and earn 20% on every plan they buy.
				</div>
				<div
					style={{
						position: 'absolute',
						left: 20,
						right: 20,
						bottom: 18,
						height: 40,
						borderRadius: 11,
						background: 'rgba(255,255,255,0.16)',
						border: '1px solid rgba(255,255,255,0.25)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8,
						color: '#fff',
						fontSize: 14,
						fontWeight: 600,
					}}
				>
					Refer Now <ArrowRight size={16} />
				</div>
			</Panel>
		</>
	);
};

// ---------------------------------------------------------------------------

type Row = {
	name: string;
	kind: string;
	flag: 'us' | 'uk' | 'de' | 'sg' | 'jp' | 'id';
	city: string;
	ip: string;
	usage: number;
	date: string;
	status: 'Active' | 'Expired' | 'Suspended';
};

const ROWS: Row[] = [
	{name: 'Windows Server 2022', kind: 'VPS', flag: 'us', city: 'New York, USA', ip: '192.168.24.11', usage: 72, date: '12 Dec 2026', status: 'Active'},
	{name: 'Cloud Hosting Pro', kind: 'Cloud', flag: 'uk', city: 'London, UK', ip: '10.0.14.201', usage: 45, date: '03 Jan 2027', status: 'Active'},
	{name: 'Storage Server XL', kind: 'Storage', flag: 'de', city: 'Frankfurt, DE', ip: '172.16.8.42', usage: 88, date: '21 Nov 2026', status: 'Suspended'},
	{name: 'Ubuntu 24.04 LTS', kind: 'VPS', flag: 'sg', city: 'Singapore, SG', ip: '10.10.2.77', usage: 31, date: '18 Feb 2027', status: 'Active'},
	{name: 'Dedicated i9 Node', kind: 'Dedicated', flag: 'jp', city: 'Tokyo, JP', ip: '203.0.113.9', usage: 64, date: '09 Mar 2027', status: 'Active'},
	{name: 'Mail Server', kind: 'Cloud', flag: 'id', city: 'Jakarta, ID', ip: '198.51.100.4', usage: 12, date: '28 Oct 2026', status: 'Expired'},
];

const COLS = [20, 64, 344, 540, 714, 960, 1106, 1250];

const Services: React.FC<{t: number}> = ({t}) => {
	const top = 328;
	const rowH = 37;
	return (
		<Panel style={{left: CONTENT_X, top, width: CONTENT_R - CONTENT_X, height: 304, ...rise(t, BOOT + 0.5, 24)}}>
			<div style={{position: 'absolute', left: 20, top: 16, fontSize: 16, fontWeight: 700, color: C.text}}>Active Service</div>
			<div style={{position: 'absolute', right: 16, top: 12, display: 'flex', gap: 6}}>
				{['All', 'Active', 'Expired'].map((f, i) => (
					<div
						key={f}
						style={{
							padding: '6px 12px',
							borderRadius: 9,
							fontSize: 12,
							fontWeight: 600,
							color: i === 0 ? C.text : C.muted,
							background: i === 0 ? 'rgba(255,255,255,0.08)' : 'transparent',
							border: `1px solid ${i === 0 ? C.lineHi : 'transparent'}`,
						}}
					>
						{f}
					</div>
				))}
			</div>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 50,
					height: 30,
					background: 'rgba(255,255,255,0.025)',
					borderTop: `1px solid ${C.line}`,
					borderBottom: `1px solid ${C.line}`,
				}}
			>
				{['#', 'Service', 'Location', 'IP Address', 'Usage', 'Renewal', 'Status'].map((h, i) => (
					<div
						key={h}
						style={{
							position: 'absolute',
							left: COLS[i],
							top: 8,
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: 0.8,
							textTransform: 'uppercase',
							color: C.dim,
						}}
					>
						{h}
					</div>
				))}
			</div>
			{ROWS.map((r, i) => {
				const y = 80 + i * rowH;
				const grow = EASE.out(invLerp(BOOT + 0.8 + i * 0.07, BOOT + 1.8 + i * 0.07, t));
				const live = r.usage + Math.sin(t * 1.7 + i * 2) * 2.5 * grow;
				return (
					<div key={r.name} style={{position: 'absolute', left: 0, right: 0, top: y, height: rowH, borderBottom: i < ROWS.length - 1 ? `1px solid ${C.line}` : 'none', ...rise(t, BOOT + 0.6 + i * 0.06, 8)}}>
						<div style={{position: 'absolute', left: COLS[0], top: 11, fontSize: 12.5, color: C.dim, fontFamily: MONO}}>{String(i + 1).padStart(2, '0')}</div>
						<div style={{position: 'absolute', left: COLS[1], top: 7, display: 'flex', alignItems: 'center', gap: 10}}>
							<div
								style={{
									width: 24,
									height: 24,
									borderRadius: 7,
									background: ['#1e3a8a', '#164e63', '#3b0764', '#14532d', '#7c2d12', '#1e3a8a'][i],
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: 10,
									fontWeight: 800,
									color: '#fff',
								}}
							>
								{r.kind[0]}
							</div>
							<span style={{fontSize: 13.5, fontWeight: 600, color: C.text}}>{r.name}</span>
						</div>
						<div style={{position: 'absolute', left: COLS[2], top: 11, display: 'flex', alignItems: 'center', gap: 9}}>
							<Flag code={r.flag} />
							<span style={{fontSize: 13, color: '#b5bac3'}}>{r.city}</span>
						</div>
						<div style={{position: 'absolute', left: COLS[3], top: 11, fontSize: 12.5, color: C.muted, fontFamily: MONO}}>{r.ip}</div>
						<div style={{position: 'absolute', left: COLS[4], top: 16, width: 150, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)'}}>
							<div
								style={{
									width: `${live * grow}%`,
									height: '100%',
									borderRadius: 3,
									background: r.usage > 80 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#3b82f6,#818cf8)',
								}}
							/>
						</div>
						<div style={{position: 'absolute', left: COLS[4] + 164, top: 10, fontSize: 12.5, color: '#b5bac3', fontWeight: 600}}>{Math.round(live * grow)}%</div>
						<div style={{position: 'absolute', left: COLS[5], top: 11, fontSize: 13, color: '#b5bac3'}}>{r.date}</div>
						<div style={{position: 'absolute', left: COLS[6], top: 6}}>
							<Badge tone={r.status === 'Active' ? 'green' : 'red'}>{r.status}</Badge>
						</div>
						<div style={{position: 'absolute', left: COLS[7], top: 9}}>
							<Ellipsis size={18} color={C.dim} />
						</div>
					</div>
				);
			})}
		</Panel>
	);
};

// ---------------------------------------------------------------------------

const TICKETS = [
	{title: 'Server migration help', id: '#TK-2041', when: '2m ago', status: 'Open' as const},
	{title: 'Invoice shows wrong VAT', id: '#TK-2038', when: '1h ago', status: 'Pending' as const},
	{title: 'DNS not propagating', id: '#TK-2033', when: '5h ago', status: 'Open' as const},
	{title: 'Upgrade to 64 GB RAM', id: '#TK-2027', when: '1d ago', status: 'Closed' as const},
];

const Support: React.FC<{t: number}> = ({t}) => (
	<Panel style={{left: CONTENT_X, top: 648, width: 440, height: 328, ...rise(t, BOOT + 0.7, 24)}}>
		<div style={{position: 'absolute', left: 20, top: 18, fontSize: 16, fontWeight: 700, color: C.text}}>Support Tickets</div>
		<div
			style={{
				position: 'absolute',
				right: 16,
				top: 13,
				padding: '6px 12px',
				borderRadius: 9,
				fontSize: 12,
				fontWeight: 600,
				color: C.text,
				background: 'rgba(255,255,255,0.06)',
				border: `1px solid ${C.lineHi}`,
			}}
		>
			View All
		</div>
		{TICKETS.map((tk, i) => (
			<div
				key={tk.id}
				style={{
					position: 'absolute',
					left: 16,
					right: 16,
					top: 62 + i * 64,
					height: 54,
					borderRadius: 12,
					background: 'rgba(255,255,255,0.025)',
					border: `1px solid ${C.line}`,
					...rise(t, BOOT + 0.9 + i * 0.07, 10),
				}}
			>
				<div
					style={{
						position: 'absolute',
						left: 12,
						top: 11,
						width: 32,
						height: 32,
						borderRadius: 10,
						background: 'rgba(59,130,246,0.14)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Ticket size={16} color="#93c5fd" />
				</div>
				<div style={{position: 'absolute', left: 56, top: 9, fontSize: 13.5, fontWeight: 600, color: C.text}}>{tk.title}</div>
				<div style={{position: 'absolute', left: 56, top: 29, fontSize: 11.5, color: C.muted}}>
					{tk.id} · {tk.when}
				</div>
				<div style={{position: 'absolute', right: 12, top: 14}}>
					<Badge tone={tk.status === 'Open' ? 'green' : tk.status === 'Pending' ? 'amber' : 'gray'}>{tk.status}</Badge>
				</div>
			</div>
		))}
	</Panel>
);

const SERVER_CARDS = [
	{title: 'Cloud Server', price: 'From $12/mo', Art: CloudServerArt},
	{title: 'Dedicated Server', price: 'From $89/mo', Art: DedicatedServerArt},
	{title: 'Storage Server', price: 'From $24/mo', Art: StorageServerArt},
];

const ServerCards: React.FC<{t: number}> = ({t}) => {
	const left0 = CONTENT_X + 440 + 16;
	const w = (CONTENT_R - left0 - 32) / 3;
	return (
		<>
			{SERVER_CARDS.map(({title, price, Art}, i) => (
				<Panel
					key={title}
					style={{
						left: left0 + i * (w + 16),
						top: 648,
						width: w,
						height: 328,
						background: 'linear-gradient(180deg, #141922, #0f1217)',
						...rise(t, BOOT + 0.8 + i * 0.1, 24),
					}}
				>
					<div style={{position: 'absolute', left: 20, top: 18, fontSize: 16, fontWeight: 700, color: C.text}}>{title}</div>
					<div style={{position: 'absolute', left: 20, top: 42, fontSize: 12.5, color: C.muted}}>{price}</div>
					<div
						style={{
							position: 'absolute',
							right: 16,
							top: 16,
							width: 32,
							height: 32,
							borderRadius: 10,
							border: `1px solid ${C.lineHi}`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<ArrowRight size={15} color={C.muted} style={{transform: 'rotate(-45deg)'}} />
					</div>
					<div style={{position: 'absolute', left: (w - 240) / 2, bottom: 40}}>
						<Art t={t + i} />
					</div>
					<div style={{position: 'absolute', left: 20, right: 20, bottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted}}>
						<span>{['99.99% uptime', 'Bare metal', 'NVMe RAID'][i]}</span>
						<span style={{color: '#93c5fd', fontWeight: 600}}>{['12 live', '4 live', '7 live'][i]}</span>
					</div>
				</Panel>
			))}
		</>
	);
};

// ---------------------------------------------------------------------------

export const Dashboard: React.FC<{s: DashboardState}> = ({s}) => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			top: 0,
			width: SCREEN_W,
			height: SCREEN_H,
			background: C.bg,
			fontFamily: FONT,
			overflow: 'hidden',
			WebkitFontSmoothing: 'antialiased',
		}}
	>
		<Hero t={s.t} />
		<Services t={s.t} />
		<Support t={s.t} />
		<ServerCards t={s.t} />
		<Header s={s} />
		<Sidebar s={s} />
	</div>
);
