// Lens + finishing pass, the "camera" every frame goes through:
// barrel distortion with per-channel dispersion (real lens CA), zoom/whip blur, anamorphic
// streaks (from StreakPass), flash, linear->sRGB, vignette, film grain.
// Plus StreakPass: thresholded highlights smeared horizontally at quarter resolution.

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    tStreak: { value: null },
    uRes: { value: [1920, 1080] },
    uTime: { value: 0 },
    uGrain: { value: 0.03 },
    uVignette: { value: 0.3 },
    uCA: { value: 0.002 },
    uDistort: { value: 0.0 },
    uZoomBlur: { value: 0 },
    uZoomCenter: { value: [0.5, 0.5] },
    uDirBlur: { value: [0, 0] },
    uStreak: { value: 0 },
    uStreakTint: { value: [1, 0.72, 0.35] },
    uFlash: { value: 0 },
    uFlashColor: { value: [1, 1, 1] },
    uFade: { value: 0 },
    uLift: { value: [0, 0, 0] },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tStreak;
    uniform vec2 uRes, uZoomCenter, uDirBlur;
    uniform float uTime, uGrain, uVignette, uCA, uDistort, uZoomBlur, uStreak, uFlash, uFade;
    uniform vec3 uStreakTint, uFlashColor, uLift;
    varying vec2 vUv;

    vec2 barrel(vec2 uv, float k) {
      vec2 d = uv - 0.5;
      d.x *= uRes.x / uRes.y;
      float r2 = dot(d, d);
      float f = (1.0 + k * r2) / (1.0 + k * 0.32);   // normalised so the frame stays filled
      d *= f;
      d.x /= uRes.x / uRes.y;
      return d + 0.5;
    }
    vec3 tap(vec2 uv) {
      // dispersion: each channel sees a slightly different distortion strength
      float k = uDistort;
      float c = uCA * 40.0;
      return vec3(
        texture2D(tDiffuse, barrel(uv, k + c)).r,
        texture2D(tDiffuse, barrel(uv, k)).g,
        texture2D(tDiffuse, barrel(uv, k - c)).b
      );
    }
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    vec3 toSRGB(vec3 c) {
      c = clamp(c, 0.0, 1.0);
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }
    void main() {
      vec3 col;
      float blurAmt = uZoomBlur + length(uDirBlur);
      if (blurAmt < 0.0005) {
        col = tap(vUv);
      } else {
        col = vec3(0.0);
        float tot = 0.0;
        float j = hash(vUv * uRes + uTime) - 0.5;
        for (int i = 0; i < 24; i++) {
          float k = (float(i) + j) / 23.0 - 0.5;
          vec2 uv = vUv + uDirBlur * k;
          uv = uZoomCenter + (uv - uZoomCenter) * (1.0 - uZoomBlur * (k + 0.5));
          float w = 1.0 - abs(k) * 0.9;
          col += tap(uv) * w;
          tot += w;
        }
        col /= tot;
      }
      col += texture2D(tStreak, barrel(vUv, uDistort)).rgb * uStreakTint * uStreak;
      col += uLift;
      col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
      col = toSRGB(col);
      vec2 d = vUv - 0.5;
      d.x *= uRes.x / uRes.y;
      col *= mix(1.0, smoothstep(1.1, 0.2, length(d)), uVignette);
      col += (hash(floor(vUv * uRes) + fract(uTime * 7.31) * 1000.0) - 0.5) * uGrain;
      col *= 1.0 - uFade;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

const StreakShader = {
  uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.9 }, uLen: { value: 0.16 }, uAspect: { value: 16 / 9 } },
  vertexShader: FinalShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uThreshold, uLen;
    varying vec2 vUv;
    vec3 bright(vec2 uv) {
      vec3 c = texture2D(tDiffuse, uv).rgb;
      float l = max(c.r, max(c.g, c.b));
      return c * smoothstep(uThreshold, uThreshold + 0.6, l);
    }
    void main() {
      vec3 acc = vec3(0.0);
      float tot = 0.0;
      for (int i = -64; i <= 64; i++) {
        float k = float(i) / 64.0;
        float w = exp(-abs(k) * 3.0);
        acc += bright(vUv + vec2(k * uLen, 0.0)) * w;
        tot += w;
      }
      gl_FragColor = vec4(acc / tot * 2.2, 1.0);
    }
  `,
};

export class StreakPass extends Pass {
  constructor(w, h) {
    super();
    this.needsSwap = false;
    this.rt = new THREE.WebGLRenderTarget(Math.round(w / 4), Math.round(h / 4), { type: THREE.HalfFloatType });
    this.material = new THREE.ShaderMaterial(StreakShader);
    this.quad = new FullScreenQuad(this.material);
    this.active = true;
  }
  render(renderer, writeBuffer, readBuffer) {
    if (!this.active) {
      renderer.setRenderTarget(this.rt);
      renderer.clear();
      return;
    }
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.rt);
    this.quad.render(renderer);
  }
}
