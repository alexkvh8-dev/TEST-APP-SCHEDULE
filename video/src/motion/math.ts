export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number) => {
	const x = invLerp(a, b, v);
	return x * x * (3 - 2 * x);
};

export type Ease = (t: number) => number;

// CSS-style cubic-bezier. y1/y2 may leave [0, 1] for anticipation/overshoot.
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
	const sy = (t: number) => ((ay * t + by) * t + cy) * t;
	const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
	const solve = (x: number) => {
		let t = x;
		for (let i = 0; i < 8; i++) {
			const err = sx(t) - x;
			if (Math.abs(err) < 1e-7) return t;
			const d = dsx(t);
			if (Math.abs(d) < 1e-6) break;
			t -= err / d;
		}
		let lo = 0;
		let hi = 1;
		t = x;
		for (let i = 0; i < 40; i++) {
			if (sx(t) < x) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
		return t;
	};
	return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
};

// The motion vocabulary. Named after how they feel, not their maths.
export const EASE = {
	// Long cursor travel: confident launch, long soft landing.
	glide: cubicBezier(0.55, 0, 0.12, 1),
	// Short hops between neighbouring icons.
	hop: cubicBezier(0.42, 0, 0.18, 1),
	// Big screen-crossing swoops: slower out of the blocks, decisive arrival.
	swoop: cubicBezier(0.7, 0, 0.16, 1),
	// The final decision: lands a hair past the target and eases back.
	settle: cubicBezier(0.5, 0, 0.16, 1.07),
	// Cinematic camera reveal.
	reveal: cubicBezier(0.3, 0.05, 0.08, 1),
	inOut: cubicBezier(0.65, 0, 0.35, 1),
	out: cubicBezier(0.16, 1, 0.3, 1),
	in: cubicBezier(0.5, 0, 0.75, 0),
};

// Critically damped follow (Unity's SmoothDamp). Returns [value, velocity].
export const smoothDamp = (
	current: number,
	target: number,
	velocity: number,
	smoothTime: number,
	dt: number,
): [number, number] => {
	const omega = 2 / Math.max(1e-4, smoothTime);
	const x = omega * dt;
	const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
	const change = current - target;
	const temp = (velocity + omega * change) * dt;
	const v = (velocity - omega * temp) * exp;
	return [target + (change + temp) * exp, v];
};

export const mixHex = (a: string, b: string, t: number) => {
	const pa = parseInt(a.slice(1), 16);
	const pb = parseInt(b.slice(1), 16);
	const ch = (p: number, s: number) => (p >> s) & 255;
	const m = (s: number) => Math.round(lerp(ch(pa, s), ch(pb, s), clamp(t)));
	return `rgb(${m(16)}, ${m(8)}, ${m(0)})`;
};

// Damped spring impulse: 0 at t=0, rings around 0 and dies out.
export const wobble = (t: number, freq: number, decay: number) =>
	t < 0 ? 0 : Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * decay);
