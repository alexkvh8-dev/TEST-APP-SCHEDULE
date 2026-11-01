#!/usr/bin/env python3
"""Check every cut in a rendered film. For each cut time it grabs the last frame of the
outgoing shot and the first frame of the incoming one, prints how different they are, and
writes a side-by-side image per cut.

A match cut should score low (mostly grain); a hard cut that is meant to be invisible but
scores high has drifted. Read the images too: numbers can't tell a deliberate cut from a
broken one.

Usage: seam_check.py film.mp4 12 21 33 43 51.5 --fps 30 --out seams/
"""
import argparse, os, subprocess
import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('video'); ap.add_argument('cuts', nargs='+', type=float)
ap.add_argument('--fps', type=float, default=30); ap.add_argument('--out', default='seams')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

def frame(n):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.video, '-vf', f"select='eq(n\\,{n})'",
                          '-vsync', '0', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    w, h = map(int, subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                    'stream=width,height', '-of', 'csv=p=0', a.video],
                                   capture_output=True, text=True).stdout.strip().split(','))
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3)

for c in a.cuts:
    n = round(c * a.fps)
    A, B = frame(n - 1), frame(n)
    diff = np.abs(A.astype(int) - B.astype(int)).mean()
    lum = lambda x: (0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]).mean()
    print(f'cut {c:7.3f}s  frames {n-1}->{n}  mean|diff| {diff:6.2f}  luma {lum(A):6.1f} -> {lum(B):6.1f}')
    pa, pb = Image.fromarray(A).resize((960, 540)), Image.fromarray(B).resize((960, 540))
    s = Image.new('RGB', (1920, 540)); s.paste(pa, (0, 0)); s.paste(pb, (960, 0))
    d = ImageDraw.Draw(s); d.text((8, 8), f'frame {n-1}', fill='yellow'); d.text((968, 8), f'frame {n}', fill='yellow')
    s.save(os.path.join(a.out, f'cut_{c:07.3f}.png'))
