// Timing
export const FPS = 60;
export const DURATION_S = 14;

// Laptop geometry, in world pixels. The display is a 1600x1000 web page.
export const SCREEN_W = 1600;
export const SCREEN_H = 1000;
export const BEZEL = {left: 30, right: 30, top: 34, bottom: 38};
export const LID_W = SCREEN_W + BEZEL.left + BEZEL.right;
export const LID_H = SCREEN_H + BEZEL.top + BEZEL.bottom;
export const LID_T = 11;
export const LID_TILT = 13; // degrees the lid leans back from vertical
export const BASE_W = LID_W;
export const BASE_D = 1120;
export const BASE_T = 26;

// Camera: CSS perspective at 1080p; scaled with the output height.
export const PERSPECTIVE_1080 = 1800;

// The hand cursor (public/cursor-hand.png is 454x481, fingertip at 131,4).
export const CURSOR_H = 72;
export const CURSOR_W = (CURSOR_H * 454) / 481;
export const CURSOR_HOTSPOT = {x: (131 / 454) * CURSOR_W, y: (4 / 481) * CURSOR_H};
export const CURSOR_FLOAT = 46; // how far the cursor hovers above the glass
