#!/usr/bin/env python3
"""Measure smoothness of an on-screen element across a frame range: threshold it by
colour, then report centroid and equivalent radius per frame plus velocity and
acceleration. Jitter shows up as acceleration spikes or velocity sign flips that the
design didn't ask for.

Usage: track_motion.py film.mp4 1500 1620 --rgb 30,215,96 --tol 70
       (--rgb is the element's colour; --tol is the max channel distance to count a pixel)

Caveat: a material change (lit -> flat, highlights fading) changes how many pixels pass
the threshold, which reads as "size" change. Check flagged frames visually before acting.
"""
import argparse, subprocess
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('first', type=int); ap.add_argument('last', type=int)
ap.add_argument('--rgb', default='255,255,255'); ap.add_argument('--tol', type=int, default=60)
ap.add_argument('--spike', type=float, default=0.6, help='flag |acceleration| above this (px/frame^2 at 480 wide)')
a = ap.parse_args()
W, H = 480, 270
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.video, '-vf',
                      f"select='between(n\\,{a.first}\\,{a.last})',scale={W}:{H}", '-vsync', '0',
                      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(int)
target = np.array([int(v) for v in a.rgb.split(',')])
rows = []
for i, f in enumerate(frames):
    m = (np.abs(f - target) <= a.tol).all(-1)
    n = m.sum()
    if n < 20:
        rows.append(None); continue
    ys, xs = np.nonzero(m)
    rows.append(np.array([xs.mean(), ys.mean(), np.sqrt(n / np.pi)]))
print('frame     cx      cy     r    |v|    |acc|')
flags = []
for i, r in enumerate(rows):
    fr = a.first + i
    if r is None:
        print(f'{fr:5d}   (not found)'); continue
    v = acc = None
    if i >= 1 and rows[i - 1] is not None:
        v = np.linalg.norm(r - rows[i - 1])
    if i >= 2 and rows[i - 1] is not None and rows[i - 2] is not None:
        acc = np.linalg.norm(r - 2 * rows[i - 1] + rows[i - 2])
        if acc > a.spike: flags.append(fr)
    print(f'{fr:5d} {r[0]:7.1f} {r[1]:7.1f} {r[2]:6.2f}  {"" if v is None else f"{v:5.2f}"}  {"" if acc is None else f"{acc:5.2f}"}{"  <-- spike" if acc and acc > a.spike else ""}')
print('\nspikes at frames:', flags or 'none')
