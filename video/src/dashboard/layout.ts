import {
	Cloud,
	CreditCard,
	Gift,
	Globe,
	HardDrive,
	LayoutDashboard,
	LifeBuoy,
	Server,
	Settings,
	UserCog,
	type LucideIcon,
} from 'lucide-react';

// Every position the cursor aims for lives here, so the dashboard and the
// animation timeline can never drift apart.

export const SIDEBAR_W = 248;
export const HEADER_H = 72;
export const CONTENT_X = SIDEBAR_W + 24;
export const CONTENT_R = 1600 - 24;

export const NAV_X = 16;
export const NAV_W = SIDEBAR_W - 32;
export const NAV_ITEM_H = 44;
export const NAV_STEP = 48;

export type NavItem = {label: string; Icon: LucideIcon; group: number};

export const NAV_GROUPS = ['Menu', 'Finance', 'Settings'];

export const NAV_ITEMS: NavItem[] = [
	{label: 'Dashboard', Icon: LayoutDashboard, group: 0},
	{label: 'Virtual Servers', Icon: Cloud, group: 0},
	{label: 'Dedicated Servers', Icon: Server, group: 0},
	{label: 'VPS Servers', Icon: HardDrive, group: 0},
	{label: 'Domain Names', Icon: Globe, group: 0},
	{label: 'Billing', Icon: CreditCard, group: 1},
	{label: 'Affiliate Program', Icon: Gift, group: 1},
	{label: 'Setting', Icon: Settings, group: 2},
	{label: 'Account Setting', Icon: UserCog, group: 2},
	{label: 'Support', Icon: LifeBuoy, group: 2},
];

const GROUP_LABEL_H = 28;
const GROUP_GAP = 18;
const NAV_TOP = 96;

export const groupLabelTop = (g: number) => {
	let y = NAV_TOP;
	for (let i = 0; i < g; i++) {
		y += GROUP_LABEL_H + NAV_ITEMS.filter((n) => n.group === i).length * NAV_STEP + GROUP_GAP;
	}
	return y;
};

export const navItemTop = (i: number) => {
	const g = NAV_ITEMS[i].group;
	const indexInGroup = NAV_ITEMS.slice(0, i).filter((n) => n.group === g).length;
	return groupLabelTop(g) + GROUP_LABEL_H + indexInGroup * NAV_STEP;
};

export const NAV_ICON_X = NAV_X + 16 + 10;

export const navIcon = (i: number) => ({x: NAV_ICON_X, y: navItemTop(i) + NAV_ITEM_H / 2});

// Header icon buttons (centres, screen pixels).
export const HEADER_BTN = 40;
export const THEME_BTN = {x: 1450, y: HEADER_H / 2};
export const BELL_BTN = {x: 1500, y: HEADER_H / 2};
export const AVATAR = {x: 1552, y: HEADER_H / 2};

export const ACTIVE_START = 0; // Dashboard
export const ACTIVE_FINAL = 2; // Dedicated Servers: where the cursor settles
