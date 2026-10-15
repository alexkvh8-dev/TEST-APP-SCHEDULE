"""Generate the procedural textures used by the scene.

- public/rock-*.png   lunar-looking boulders (normal-mapped, lit from the
                      upper left with a cool rim light from the screen side)
- public/grain-*.png  film-grain tiles cycled per frame by the post layer

Run from the video/ folder:  python3 scripts/generate-assets.py
Needs numpy and Pillow only.
"""

import math
import os

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "public")


def fbm(h, w, rng, base=4, octaves=6, persistence=0.5):
    """Fractal value noise in [0, 1], built by upscaling random grids."""
    acc = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cells = base * (2**o)
        grid = rng.random((cells + 1, cells + 1)).astype(np.float32)
        layer = Image.fromarray(grid, mode="F").resize((w, h), Image.BICUBIC)
        acc += np.asarray(layer) * amp
        total += amp
        amp *= persistence
    acc /= total
    return (acc - acc.min()) / (acc.max() - acc.min() + 1e-6)


def blur(a, radius):
    """Separable Gaussian blur on a float array (Pillow cannot blur mode F)."""
    sigma = max(radius, 1e-3)
    r = int(math.ceil(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2).astype(np.float32)
    k /= k.sum()
    a = a.astype(np.float32)
    p = np.pad(a, ((0, 0), (r, r)), mode="edge")
    a = sum(k[i] * p[:, i : i + a.shape[1]] for i in range(2 * r + 1))
    p = np.pad(a, ((r, r), (0, 0)), mode="edge")
    return sum(k[i] * p[i : i + a.shape[0], :] for i in range(2 * r + 1))


def rock(seed, w, h, flat=0.62, lumps=1.0, tone=0.46, pores=1.0):
    ss = 2  # supersample for clean silhouettes
    W, H = w * ss, h * ss
    rng = np.random.default_rng(seed)

    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    # Leave room for the lumpy outline so it never touches the canvas edge.
    R = min(W * 0.36, H / (1.45 + flat))
    cx, cy = W * 0.5, 1.42 * R + (H - (1.45 + flat) * R) / 2
    dx, dy = (xs - cx) / R, (ys - cy) / R
    ang = np.arctan2(dy, dx)
    dist = np.sqrt(dx * dx + dy * dy)

    # Silhouette: a lumpy polar radius, flattened where it meets the ground.
    radius = np.ones_like(ang)
    for k, a in ((2, 0.10), (3, 0.08), (5, 0.045), (7, 0.03), (11, 0.015)):
        radius += a * lumps * np.sin(k * ang + rng.random() * 6.283)
    edge_noise = fbm(H, W, rng, base=6, octaves=4)
    radius += (edge_noise - 0.5) * 0.10
    radius *= 1.0 + 0.14 * np.clip(-dy, 0, 1)  # taller crown

    inside = dist / radius
    ground = cy + R * flat
    mask = np.clip((1.0 - inside) * R / 2.0, 0, 1) * np.clip((ground - ys) / 2.0, 0, 1)

    # Height (in pixels): a dome plus layered detail, pores and a few craters.
    dome = np.sqrt(np.clip(1.0 - inside**2, 0, 1)) ** 0.8
    detail = fbm(H, W, rng, base=5, octaves=7, persistence=0.55)
    fine = fbm(H, W, rng, base=40, octaves=3, persistence=0.6)
    height = R * (0.8 * dome + (detail - 0.5) * 0.16 * dome + (fine - 0.5) * 0.012)

    pit_field = fbm(H, W, rng, base=26, octaves=2, persistence=0.4)
    pits = np.clip((pit_field - 0.66) / 0.12, 0, 1) ** 1.5
    height -= pits * R * 0.012 * pores

    for _ in range(int(3 + rng.random() * 4)):
        px, py = rng.uniform(-0.6, 0.6), rng.uniform(-0.7, 0.35)
        pr = rng.uniform(0.05, 0.16)
        d = np.sqrt((dx - px) ** 2 + (dy - py) ** 2) / pr
        crater = np.where(d < 1, -(1 - d**2) * 0.5, 0) + np.exp(-((d - 1.0) ** 2) * 18) * 0.14
        height += crater * dome * pr * R

    # Normals from the height field.
    k = 1.0
    gy, gx = np.gradient(height)
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(height)
    n = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / n, ny / n, nz / n

    def light(lx, ly, lz):
        l = math.sqrt(lx * lx + ly * ly + lz * lz)
        return np.clip(nx * lx / l + ny * ly / l + nz * lz / l, 0, 1)

    key = light(-0.55, -0.75, 0.55)
    fill = light(0.2, -0.1, 1.0)
    rim = light(0.95, -0.25, 0.2) ** 2.2

    cavity = np.clip((height - blur(height, 6 * ss)) / (R * 0.012) + 0.5, 0, 1)
    tint = fbm(H, W, rng, base=3, octaves=4)
    albedo = tone + (tint - 0.5) * 0.10 + (fine - 0.5) * 0.06

    ground_occ = 1.0 - 0.85 * np.clip((ys - (cy + R * (flat - 0.75))) / (R * 0.75), 0, 1) ** 1.3

    lum = albedo * (0.06 + 1.1 * key**1.5 + 0.12 * fill) * (0.55 + 0.45 * cavity) * ground_occ
    r = lum + rim * 0.10
    g = lum + rim * 0.15
    b = lum * 1.04 + rim * 0.30

    rgb = np.stack([r, g, b], -1)
    rgb = np.clip(rgb, 0, 1) ** (1 / 1.12)
    rgba = np.dstack([rgb, mask]) * 255
    img = Image.fromarray(rgba.clip(0, 255).astype(np.uint8), "RGBA")
    img = img.resize((w, h), Image.LANCZOS)
    return img.crop(img.getbbox())


def soften(img, radius):
    """Depth-of-field copy: blur premultiplied so the edges stay dark, not haloed."""
    a = np.asarray(img).astype(np.float32) / 255
    pad = int(radius * 3)
    a = np.pad(a, ((pad, pad), (pad, pad), (0, 0)))
    rgb, al = a[..., :3] * a[..., 3:], a[..., 3]
    out_rgb = np.stack([blur(rgb[..., i], radius) for i in range(3)], -1)
    out_a = blur(al, radius)
    out = np.dstack([out_rgb / np.maximum(out_a[..., None], 1e-4), out_a])
    return Image.fromarray((out.clip(0, 1) * 255).astype(np.uint8), "RGBA")


def main():
    os.makedirs(OUT, exist_ok=True)
    specs = [
        ("rock-a", 11, 1500, 1150, dict(flat=0.62, lumps=1.0, tone=0.47)),
        ("rock-b", 23, 1300, 900, dict(flat=0.5, lumps=1.3, tone=0.42)),
        ("rock-c", 37, 900, 760, dict(flat=0.66, lumps=0.8, tone=0.5)),
        ("rock-d", 53, 700, 520, dict(flat=0.48, lumps=1.4, tone=0.44, pores=1.4)),
    ]
    for name, seed, w, h, kw in specs:
        img = rock(seed, w, h, **kw)
        img.save(os.path.join(OUT, f"{name}.png"), optimize=True)
        soften(img.resize((img.width // 2, img.height // 2), Image.LANCZOS), 7).save(
            os.path.join(OUT, f"{name}-soft.png"), optimize=True
        )
        print(name, img.size)

    rng = np.random.default_rng(7)
    for i in range(4):
        g = rng.normal(0.5, 0.16, (256, 256)).clip(0, 1)
        g = 0.65 * g + 0.35 * blur(g, 0.6)
        Image.fromarray((g * 255).astype(np.uint8), "L").save(os.path.join(OUT, f"grain-{i}.png"))


if __name__ == "__main__":
    main()
