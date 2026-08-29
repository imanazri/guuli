/**
 * The scene layer's own contracts: the level-of-detail ramp, the guarantees the
 * renderer relies on (spots sorted, alpha reaching exactly 0 at the boundary),
 * and the cache.
 *
 * That the scene *matches the reference* is covered in parity.test.ts.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MIN_SPOTS } from "../src/engine.ts";
import {
	buildMeshScene,
	clearSceneCache,
	FRAME,
	HIGHLIGHT_EXTENT,
	HIGHLIGHT_STOPS,
	SPOT_EXTENT,
	SPOT_STOPS,
} from "../src/scene.ts";
import {
	deriveHighlightStops,
	deriveSpotStops,
	HIGHLIGHT_EXTENT as derivedHighlightExtent,
	SPOT_EXTENT as derivedSpotExtent,
} from "../scripts/derive-stops.ts";

const SEEDS = ["jane@example.com", "acme", "outpace", 42, 0, "user-7"];

describe("level of detail", () => {
	it("keeps only the largest spots at the smallest size", () => {
		for (const seed of SEEDS) {
			assert.equal(buildMeshScene(seed, 16).spots.length, MIN_SPOTS);
		}
	});

	it("keeps every spot at full size", () => {
		for (const seed of SEEDS) {
			// The engine draws 8-12 spots; at full detail none are dropped.
			const n = buildMeshScene(seed, 160).spots.length;
			assert.ok(n >= 8 && n <= 12, `${n} spots`);
		}
	});

	it("never drops spots as the size grows", () => {
		for (const seed of SEEDS) {
			let previous = 0;
			for (const size of [16, 24, 32, 48, 64, 96, 128, 160, 256]) {
				const n = buildMeshScene(seed, size).spots.length;
				assert.ok(n >= previous, `${seed}: ${n} at ${size} after ${previous}`);
				previous = n;
			}
		}
	});

	it("grows and centres the survivors when small", () => {
		for (const seed of SEEDS) {
			const small = buildMeshScene(seed, 16);
			const large = buildMeshScene(seed, 160);
			// The same spot, kept at both sizes, is bigger and nearer the middle.
			assert.ok(small.spots[0].radius > large.spots[0].radius);
			const mid = FRAME / 2;
			const distance = (s: { x: number; y: number }) =>
				Math.hypot(s.x - mid, s.y - mid);
			assert.ok(distance(small.spots[0]) <= distance(large.spots[0]));
		}
	});
});

describe("renderer guarantees", () => {
	it("spots are ordered largest first", () => {
		for (const seed of SEEDS) {
			const { spots } = buildMeshScene(seed, 160);
			for (let i = 1; i < spots.length; i++) {
				assert.ok(spots[i - 1].radius >= spots[i].radius);
			}
		}
	});

	it("every spot has a positive radius and a valid colour", () => {
		for (const seed of SEEDS) {
			const scene = buildMeshScene(seed, 64);
			assert.match(scene.background, /^#[0-9A-F]{6}$/);
			for (const spot of scene.spots) {
				assert.ok(spot.radius > 0);
				assert.match(spot.color, /^#[0-9A-F]{6}$/);
			}
			assert.ok(scene.highlight.radius > 0);
		}
	});

	it("alpha ramps end at exactly 0 and never rise", () => {
		// Reaching exactly 0 is what lets the renderer draw a spot as a <Circle>
		// instead of a full-frame <Rect>: the fill vanishes on the boundary, so
		// there is no edge to see.
		for (const stops of [SPOT_STOPS, HIGHLIGHT_STOPS]) {
			assert.equal(stops[0][0], 0);
			assert.equal(stops[stops.length - 1][0], 1);
			assert.equal(stops[stops.length - 1][1], 0);
			for (let i = 1; i < stops.length; i++) {
				assert.ok(stops[i][0] > stops[i - 1][0], "offsets increase");
				assert.ok(stops[i][1] <= stops[i - 1][1], "alpha never rises");
			}
		}
	});

	it("the ramps carry the blur the web original applies afterwards", () => {
		// Two fingerprints of a baked-in Gaussian. Lose either and the avatar
		// comes out harder and more saturated than the web version.
		assert.ok(
			SPOT_STOPS[0][1] < 1 && SPOT_STOPS[0][1] > 0.85,
			`peak ${SPOT_STOPS[0][1]} should be pulled down, not flattened`,
		);
		assert.ok(HIGHLIGHT_STOPS[0][1] < 0.15);

		// And the tail has to be drawn past the nominal radius or it gets clipped
		// back into a hard edge.
		assert.ok(SPOT_EXTENT > 1 && HIGHLIGHT_EXTENT > 1);
	});

	it("the shipped ramps are what the derivation produces", () => {
		// Keeps the hard-coded tables and scripts/derive-stops.ts from drifting.
		assert.deepEqual(SPOT_STOPS.map((s) => [...s]), deriveSpotStops());
		assert.deepEqual(HIGHLIGHT_STOPS.map((s) => [...s]), deriveHighlightStops());
	});

	it("the shipped extents are what the derivation produces", () => {
		assert.equal(SPOT_EXTENT, derivedSpotExtent);
		assert.equal(HIGHLIGHT_EXTENT, derivedHighlightExtent);
	});
});

describe("caching", () => {
	it("returns a stable scene for the same seed and size", () => {
		clearSceneCache();
		const a = buildMeshScene("acme", 40);
		const b = buildMeshScene("acme", 40);
		assert.equal(a, b, "same object, so React memoisation holds");
		clearSceneCache();
		assert.deepEqual(buildMeshScene("acme", 40), a, "and recomputes the same");
	});

	it("buckets fractional sizes to whole pixels", () => {
		clearSceneCache();
		assert.equal(buildMeshScene("acme", 40.2), buildMeshScene("acme", 39.8));
	});

	it("treats a string seed and its numeric hash as one entry", () => {
		clearSceneCache();
		const viaString = buildMeshScene("acme", 40);
		assert.equal(buildMeshScene(2281398667, 40), viaString);
	});

	it("evicts the oldest entry once full", () => {
		clearSceneCache();
		const first = buildMeshScene("seed-0", 40);
		for (let i = 1; i <= 300; i++) buildMeshScene(`seed-${i}`, 40);
		assert.notEqual(buildMeshScene("seed-0", 40), first, "recomputed, not held");
	});
});
