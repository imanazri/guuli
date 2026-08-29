/**
 * Palette engine for guuli.
 *
 * Pure math, no renderer, no platform APIs: a seed in, a palette out.
 *
 * Every expression in this file is load-bearing: it decides what each user's
 * avatar looks like. Changing a constant, or reordering a `random()` call,
 * re-rolls every avatar already in the wild. That is a major version bump,
 * never a refactor.
 */

export type Harmony =
	| "analogous"
	| "triadic"
	| "splitComplementary"
	| "tetradic"
	| "complementary";

export interface GradientPalette {
	/** The numeric seed the palette was derived from. */
	seed: number;
	/** Hex color stops used to paint the mesh (`#RRGGBB`). */
	colors: string[];
	/** Which color-harmony rule produced the hues. */
	harmony: Harmony;
}

const HARMONY_TYPES: Harmony[] = [
	"analogous",
	"triadic",
	"splitComplementary",
	"tetradic",
	"complementary",
];

/**
 * Successive multiples of the golden ratio's conjugate, taken modulo 1, spread
 * as evenly around the circle as any sequence can. Multiplying the seed by a
 * plain angle instead leaves the hues on a coarse lattice -- `137.5` has a
 * period of only 144 over integer seeds -- so neighbouring seeds visibly share
 * hues.
 */
const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

/** Mulberry32. Same generator, same sequence, on every platform. */
export function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s += 0x6d2b79f5;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hslToHex(h: number, s: number, l: number): string {
	h = ((h % 360) + 360) % 360;
	s = Math.max(0, Math.min(100, s)) / 100;
	l = Math.max(0, Math.min(100, l)) / 100;

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
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

	const toHex = (n: number) => {
		const hex = Math.round((n + m) * 255).toString(16);
		return hex.length === 1 ? `0${hex}` : hex;
	};
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function harmonyHues(baseHue: number, harmony: Harmony): number[] {
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

/**
 * Stable string -> 32-bit unsigned hash (FNV-1a + bit-mixing avalanche).
 * Uses the full uint32 range as a seed so similar strings diverge fully.
 */
export function seedFromString(input: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	h ^= h >>> 16;
	h = Math.imul(h, 0x7feb352d) >>> 0;
	h ^= h >>> 15;
	h = Math.imul(h, 0x846ca68b) >>> 0;
	h ^= h >>> 16;
	return h >>> 0;
}

/**
 * Normalize a seed to the number the palette math runs on.
 *
 * A finite number is already a seed. Everything else is hashed from its text,
 * including the values TypeScript says cannot arrive here: `undefined` from an
 * unloaded record, `NaN` from a failed parse. Those are real -- an avatar in a
 * list is rendered before its data always is -- and left alone they either
 * throw or poison the arithmetic into colours like `#DF20NAN`, which
 * react-native-svg then fails to parse. Hashing the text keeps them
 * deterministic, distinct from each other, and always renderable.
 */
export function toSeed(seed: number | string): number {
	if (typeof seed === "number" && Number.isFinite(seed)) return seed;
	if (typeof seed === "string") return seedFromString(seed);
	return seedFromString(String(seed));
}

/** Derive the deterministic color palette for a seed. */
export function generatePalette(seed: number | string): GradientPalette {
	const s = toSeed(seed);
	const random = seededRandom(s);
	const baseHue = ((s * GOLDEN_RATIO_CONJUGATE) % 1) * 360;
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

/* -- level of detail: complexity follows the display size -- */

/**
 * The same amount of detail is right at 160 px and wrong at 24 px: four hues
 * and a dozen soft spots average out into one muddy blob. So the complexity
 * ramps with the size the avatar is shown at. Same seed, same palette order,
 * same layout, just fewer and bigger parts when small.
 */

/** At or below this display size (px), draw the simplest version. */
export const DETAIL_MIN_SIZE = 16;
/** At or above this display size (px), draw the full complexity. */
export const DETAIL_FULL_SIZE = 160;
/** Colors a simplified avatar keeps, the start of the seed's palette. */
export const MIN_COLORS = 2;
/** Mesh spots a simplified avatar keeps, the largest ones. */
export const MIN_SPOTS = 4;
/** How far the kept spots move toward the center at the smallest size. */
export const CENTER_PULL = 0.15;
/** How much the kept spots grow at the smallest size. */
export const RADIUS_BOOST = 0.2;

/**
 * How much complexity a display size can carry, 0 (tiny) to 1 (large).
 * The ramp is logarithmic because what the eye reads is the doubling of the
 * size, not the pixel count.
 */
export function detailFor(displaySize: number): number {
	if (!(displaySize > 0)) return 1;
	const t =
		Math.log2(displaySize / DETAIL_MIN_SIZE) /
		Math.log2(DETAIL_FULL_SIZE / DETAIL_MIN_SIZE);
	return Math.max(0, Math.min(1, t));
}

/**
 * The palette trimmed to the number of colors `detail` can carry. The kept
 * colors are the first ones, so a small avatar is the same avatar with its
 * later accent hues dropped, not a different one.
 */
export function paletteForDetail(colors: string[], detail: number): string[] {
	if (colors.length <= MIN_COLORS) return colors;
	const n = Math.round(MIN_COLORS + detail * (colors.length - MIN_COLORS));
	return colors.slice(0, Math.max(MIN_COLORS, Math.min(colors.length, n)));
}
