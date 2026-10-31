// Final "lens" pass: zoom blur, directional (whip) blur, chromatic aberration, flash,
// linear -> sRGB, vignette, animated film grain. Runs last and writes to the screen.

export const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: [1920, 1080] },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uVignette: { value: 0.35 },
    uCA: { value: 0.0015 },
    uZoomBlur: { value: 0 },
    uZoomCenter: { value: [0.5, 0.5] },
    uDirBlur: { value: [0, 0] },
    uFlash: { value: 0 },
    uFlashColor: { value: [1, 1, 1] },
    uFade: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes, uZoomCenter, uDirBlur;
    uniform float uTime, uGrain, uVignette, uCA, uZoomBlur, uFlash, uFade;
    uniform vec3 uFlashColor;
    varying vec2 vUv;

    vec3 tap(vec2 uv) {
      vec2 d = uv - 0.5;
      vec2 off = d * uCA * (0.6 + dot(d, d) * 3.0);
      return vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
    }
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
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
        float jitter = hash(vUv * uRes + uTime) - 0.5;
        for (int i = 0; i < 28; i++) {
          float k = (float(i) + jitter) / 27.0 - 0.5;
          vec2 uv = vUv + uDirBlur * k;
          uv = uZoomCenter + (uv - uZoomCenter) * (1.0 - uZoomBlur * (k + 0.5));
          float w = 1.0 - abs(k) * 0.9;
          col += tap(uv) * w;
          tot += w;
        }
        col /= tot;
      }
      col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
      col = toSRGB(col);
      vec2 d = vUv - 0.5;
      d.x *= uRes.x / uRes.y;
      float v = smoothstep(1.05, 0.25, length(d));
      col *= mix(1.0, v, uVignette);
      float g = hash(floor(vUv * uRes) + fract(uTime * 7.31) * 1000.0) - 0.5;
      col += g * uGrain;
      col *= 1.0 - uFade;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
