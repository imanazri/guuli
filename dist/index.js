import { memo, useMemo, useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { jsx, jsxs } from 'react/jsx-runtime';

// src/GradientAvatar.tsx

// src/engine.ts
var HARMONY_TYPES = [
  "analogous",
  "triadic",
  "splitComplementary",
  "tetradic",
  "complementary"
];
var GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
function seededRandom(seed) {
  let s = seed;
  return () => {
    s += 1831565813;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hslToHex(h, s, l) {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
function harmonyHues(baseHue, harmony) {
  switch (harmony) {
    case "analogous":
      return [baseHue, baseHue + 30, baseHue + 60, baseHue - 30];
    case "triadic":
      return [baseHue, baseHue + 120, baseHue + 240];
    case "splitComplementary":
      return [baseHue, baseHue + 150, baseHue + 210];
    case "tetradic":
      return [baseHue, baseHue + 90, baseHue + 180, baseHue + 270];
    case "complementary":
      return [baseHue, baseHue + 180, baseHue + 20, baseHue + 200];
  }
}
function seedFromString(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2146121005) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2221713035) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
function toSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed;
  if (typeof seed === "string") return seedFromString(seed);
  return seedFromString(String(seed));
}
function generatePalette(seed) {
  const s = toSeed(seed);
  const random = seededRandom(s);
  const baseHue = s * GOLDEN_RATIO_CONJUGATE % 1 * 360;
  const harmonyIndex = Math.floor(random() * HARMONY_TYPES.length);
  const harmony = HARMONY_TYPES[harmonyIndex];
  const hues = harmonyHues(baseHue, harmony);
  const colors = hues.map((hue) => {
    const saturation = 75 + random() * 25;
    const lightness = 50 + random() * 20;
    return hslToHex(hue, saturation, lightness);
  });
  return { seed: s, colors, harmony };
}
var DETAIL_MIN_SIZE = 16;
var DETAIL_FULL_SIZE = 160;
var MIN_COLORS = 2;
var MIN_SPOTS = 4;
var CENTER_PULL = 0.15;
var RADIUS_BOOST = 0.2;
function detailFor(displaySize) {
  if (!(displaySize > 0)) return 1;
  const t = Math.log2(displaySize / DETAIL_MIN_SIZE) / Math.log2(DETAIL_FULL_SIZE / DETAIL_MIN_SIZE);
  return Math.max(0, Math.min(1, t));
}
function paletteForDetail(colors, detail) {
  if (colors.length <= MIN_COLORS) return colors;
  const n = Math.round(MIN_COLORS + detail * (colors.length - MIN_COLORS));
  return colors.slice(0, Math.max(MIN_COLORS, Math.min(colors.length, n)));
}

// src/scene.ts
var FRAME = 100;
var SPOT_EXTENT = 1.36;
var SPOT_STOPS = [
  [0, 0.9329],
  [0.0909, 0.9127],
  [0.1818, 0.8536],
  [0.2727, 0.7564],
  [0.3636, 0.6301],
  [0.4545, 0.4863],
  [0.5455, 0.3311],
  [0.6364, 0.1799],
  [0.7273, 0.0657],
  [0.8182, 0.013],
  [0.9091, 1e-3],
  [1, 0]
];
var HIGHLIGHT_EXTENT = 1.6;
var HIGHLIGHT_STOPS = [
  [0, 0.1127],
  [0.1429, 0.1013],
  [0.2857, 0.0746],
  [0.4286, 0.0437],
  [0.5714, 0.0172],
  [0.7143, 35e-4],
  [0.8571, 3e-4],
  [1, 0]
];
function computeMeshScene(seed, displaySize) {
  const s = toSeed(seed);
  const { colors } = generatePalette(s);
  const detail = detailFor(displaySize);
  const palette = paletteForDetail(colors, detail);
  const random = seededRandom(s * 12345);
  const numSpots = 8 + Math.floor(random() * 5);
  const spots = [];
  for (let i = 0; i < numSpots; i++) {
    const angle = random() * Math.PI * 2;
    const distance = random() * FRAME * 0.4;
    const centerX = FRAME / 2 + Math.cos(angle) * distance;
    const centerY = FRAME / 2 + Math.sin(angle) * distance;
    spots.push({
      x: centerX + (random() - 0.5) * FRAME * 0.3,
      y: centerY + (random() - 0.5) * FRAME * 0.3,
      radius: FRAME * (0.3 + random() * 0.4),
      color: palette[i % palette.length],
      colorIndex: i % palette.length
    });
  }
  spots.sort((a, b) => b.radius - a.radius);
  const keep = Math.max(
    MIN_SPOTS,
    Math.round(MIN_SPOTS + detail * (numSpots - MIN_SPOTS))
  );
  const spread = 1 - (1 - detail) * CENTER_PULL;
  const grow = 1 + (1 - detail) * RADIUS_BOOST;
  const mid = FRAME / 2;
  const kept = spots.slice(0, keep).map((raw) => ({
    x: mid + (raw.x - mid) * spread,
    y: mid + (raw.y - mid) * spread,
    radius: raw.radius * grow,
    color: raw.color,
    colorIndex: raw.colorIndex
  }));
  const highlight = {
    x: FRAME * 0.3 + random() * FRAME * 0.2,
    y: FRAME * 0.3 + random() * FRAME * 0.2,
    radius: FRAME * 0.3
  };
  return { seed: s, palette, background: palette[0], spots: kept, highlight };
}
var CACHE_LIMIT = 256;
var cache = /* @__PURE__ */ new Map();
function buildMeshScene(seed, displaySize) {
  const bucket = Math.round(displaySize);
  const key = `${toSeed(seed)}|${bucket}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const scene = computeMeshScene(seed, bucket);
  cache.set(key, scene);
  if (cache.size > CACHE_LIMIT) {
    cache.delete(cache.keys().next().value);
  }
  return scene;
}
function GradientAvatarInner({
  seed,
  size = 32,
  radius,
  style,
  accessibilityLabel,
  testID
}) {
  const scene = useMemo(() => buildMeshScene(seed, size), [seed, size]);
  const uid = `g${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const borderRadius = radius ?? size / 2;
  return /* @__PURE__ */ jsx(
    View,
    {
      testID,
      accessible: accessibilityLabel !== void 0,
      accessibilityLabel,
      accessibilityRole: accessibilityLabel !== void 0 ? "image" : void 0,
      importantForAccessibility: accessibilityLabel === void 0 ? "no-hide-descendants" : void 0,
      style: [
        { width: size, height: size, borderRadius, overflow: "hidden" },
        style
      ],
      children: /* @__PURE__ */ jsxs(Svg, { width: size, height: size, viewBox: `0 0 ${FRAME} ${FRAME}`, children: [
        /* @__PURE__ */ jsxs(Defs, { children: [
          scene.palette.map((color, i) => /* @__PURE__ */ jsx(RadialGradient, { id: `${uid}c${i}`, children: SPOT_STOPS.map(([offset, opacity]) => /* @__PURE__ */ jsx(
            Stop,
            {
              offset,
              stopColor: color,
              stopOpacity: opacity
            },
            offset
          )) }, color)),
          /* @__PURE__ */ jsx(RadialGradient, { id: `${uid}h`, children: HIGHLIGHT_STOPS.map(([offset, opacity]) => /* @__PURE__ */ jsx(
            Stop,
            {
              offset,
              stopColor: "#FFFFFF",
              stopOpacity: opacity
            },
            offset
          )) })
        ] }),
        /* @__PURE__ */ jsx(Rect, { x: 0, y: 0, width: FRAME, height: FRAME, fill: scene.background }),
        scene.spots.map((spot, i) => /* @__PURE__ */ jsx(
          Circle,
          {
            cx: spot.x,
            cy: spot.y,
            r: spot.radius * SPOT_EXTENT,
            fill: `url(#${uid}c${spot.colorIndex})`
          },
          i
        )),
        /* @__PURE__ */ jsx(
          Circle,
          {
            cx: scene.highlight.x,
            cy: scene.highlight.y,
            r: scene.highlight.radius * HIGHLIGHT_EXTENT,
            fill: `url(#${uid}h)`
          }
        )
      ] })
    }
  );
}
var GradientAvatar = memo(GradientAvatarInner);
GradientAvatar.displayName = "GradientAvatar";

export { GradientAvatar, buildMeshScene, generatePalette, seedFromString, toSeed };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map