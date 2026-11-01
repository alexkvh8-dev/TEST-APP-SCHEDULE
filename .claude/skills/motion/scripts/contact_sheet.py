#!/usr/bin/env python3
"""Tile PNG stills into labelled 2x2 contact sheets (1920x1080 each) so many frames can be
reviewed in one look.  Usage: contact_sheet.py <stills_dir> <out_dir> [--cols 2]"""
import argparse, glob, os
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--cols', type=int, default=2)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
fs = sorted(glob.glob(os.path.join(a.src, '*.png')))
per = a.cols * a.cols
tw, th = 1920 // a.cols, 1080 // a.cols
for k in range(0, len(fs), per):
    sheet = Image.new('RGB', (1920, 1080), 'black')
    for j, f in enumerate(fs[k:k + per]):
        im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 150, 26], fill='black')
        d.text((6, 6), os.path.basename(f)[:-4], fill='yellow')
        sheet.paste(im, ((j % a.cols) * tw, (j // a.cols) * th))
    p = os.path.join(a.out, f'sheet{k // per:02d}.png')
    sheet.save(p)
    print(p, [os.path.basename(f) for f in fs[k:k + per]])
