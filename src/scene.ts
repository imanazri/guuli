/**
 * Turns a seed into a renderer-agnostic description of the mesh: a background
 * colour, a list of soft radial spots, and a white highlight.
 *
 * Keeping the layout separate from the drawing is what makes it testable in
 * Node with no renderer at all, and what would let a second renderer drop in
 * later without touching the math.
 *
 * The geometry is normalised to a 100x100 frame, so the SVG that consumes it is
 * resolution independent.
 */

import {
	CENTER_PULL,
	detailFor,
	generatePalette,
	MIN_SPOTS,
	paletteForDetail,
	RADIUS_BOOST,
	seededRandom,
	toSeed,
} from "./engine.ts";

/** The normalised frame the scene is laid out in. */
export const FRAME = 100;

export interface MeshSpot {
	x: number;
	y: number;
	radius: number;
	/** Hex `#RRGGBB`, also at `palette[colorIndex]` on the scene. */
	color: string;
	/** Index into {@link MeshScene.palette}. */
	colorIndex: number;
}

export interface MeshHighlight {
	x: number;
	y: number;
	radius: number;
}

export interface MeshScene {
	/** The numeric seed this scene was built from. */
	seed: number;
	/**
	 * The distinct colours the spots draw from, already trimmed to the level of
	 * detail. Two to four of them, however many spots there are.
	 *
	 * Spots reference this by index rather than each carrying its own colour,
	 * because every spot shares one normalised alpha ramp and differs only in
	 * position, size, and colour. A renderer can therefore define one gradient
	 * per colour instead of one per spot -- which, in SVG, is the difference
	 * between a dozen gradient nodes and three.
	 */
	palette: string[];
	/** Opaque base fill, the palette's first colour. */
	background: string;
	/** Largest first, already trimmed to the level of detail. */
	spots: MeshSpot[];
	/** The soft white sheen laid over everything. */
	highlight: MeshHighlight;
}

/**
 * How far past its nominal radius a spot must be drawn.
 *
 * The stops below have the blur baked into them, and a blur carries
 * colour beyond the edge it started at. Drawing only to `radius` would clip
 * that tail off and put back the hard edge we are trying to avoid.
 */
export const SPOT_EXTENT = 1.36;

/**
 * Alpha ramp for a spot, as `[offset, alpha]` pairs over the extended radius.
 *
 * This is the four-stop ramp convolved with the Gaussian that would otherwise
 * be applied as a blur over the finished frame -- see `scripts/derive-stops.ts`
 * for the derivation and why it has to be a 2D convolution. That is also why the
 * ramp starts at 0.93 rather than 1: a blur pulls a peak down, and skipping that
 * is what makes an unblurred copy read as too saturated.
 *
 * Alpha is exactly 0 at offset 1, so a spot vanishes precisely on the circle
 * the renderer draws and leaves no visible edge.
 */
export const SPOT_STOPS: ReadonlyArray<readonly [number, number]> = [
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
	[0.9091, 0.001],
	[1, 0],
];

/** As {@link SPOT_EXTENT}, for the highlight. */
export const HIGHLIGHT_EXTENT = 1.6;

/** Alpha ramp for the white highlight, same derivation. */
export const HIGHLIGHT_STOPS: ReadonlyArray<readonly [number, number]> = [
	[0, 0.1127],
	[0.1429, 0.1013],
	[0.2857, 0.0746],
	[0.4286, 0.0437],
	[0.5714, 0.0172],
	[0.7143, 0.0035],
	[0.8571, 0.0003],
	[1, 0],
];

/**
 * Build the mesh for `seed` as it should look at `displaySize` px on screen.
 *
 * `displaySize` drives the level of detail only, never the geometry: a small
 * avatar is the same avatar with its finer spots dropped and the survivors
 * grown to cover, not a different one.
 *
 * The order in which this consumes the random stream is load-bearing. Reorder
 * a single call and every avatar already rendered anywhere changes.
 */
function computeMeshScene(seed: number | string, displaySize: number): MeshScene {
	const s = toSeed(seed);
	const { colors } = generatePalette(s);
	const detail = detailFor(displaySize);
	const palette = paletteForDetail(colors, detail);
	const random = seededRandom(s * 12345);

	const numSpots = 8 + Math.floor(random() * 5);
	const spots: MeshSpot[] = [];
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
			colorIndex: i % palette.length,
		});
	}

	spots.sort((a, b) => b.radius - a.radius);

	// Level of detail. The spots are already sorted largest first, so a small
	// avatar keeps the shapes that carry the composition and drops the fine
	// ones. The survivors then grow and pull toward the centre, which fills the
	// frame the dropped spots used to cover.
	const keep = Math.max(
		MIN_SPOTS,
		Math.round(MIN_SPOTS + detail * (numSpots - MIN_SPOTS)),
	);
	const spread = 1 - (1 - detail) * CENTER_PULL;
	const grow = 1 + (1 - detail) * RADIUS_BOOST;
	const mid = FRAME / 2;

	const kept = spots.slice(0, keep).map((raw) => ({
		x: mid + (raw.x - mid) * spread,
		y: mid + (raw.y - mid) * spread,
		radius: raw.radius * grow,
		color: raw.color,
		colorIndex: raw.colorIndex,
	}));

	// Drawn after the spot loop, so these draw from the stream last.
	const highlight = {
		x: FRAME * 0.3 + random() * FRAME * 0.2,
		y: FRAME * 0.3 + random() * FRAME * 0.2,
		radius: FRAME * 0.3,
	};

	return { seed: s, palette, background: palette[0], spots: kept, highlight };
}

/**
 * Scenes are pure and a list re-renders constantly, so keep the recent ones.
 * Insertion-ordered `Map` doubling as an LRU: a hit is re-inserted to the end,
 * and the oldest key falls off the front once the cache is full.
 */
const CACHE_LIMIT = 256;
const cache = new Map<string, MeshScene>();

/** Test seam: drop everything the cache is holding. */
export function clearSceneCache(): void {
	cache.clear();
}

/** {@link computeMeshScene}, memoised. See it for what the arguments mean. */
export function buildMeshScene(
	seed: number | string,
	displaySize: number,
): MeshScene {
	// Detail follows the on-screen size, which is continuous; bucket it to whole
	// pixels so a resize animation does not miss the cache on every frame.
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
		cache.delete(cache.keys().next().value as string);
	}
	return scene;
}
