/**
 * Frozen scene geometry.
 *
 * The palette goldens in engine.test.ts prove the colours never move. These
 * prove the *layout* never moves: spot positions, radii, palette indices and
 * the highlight, for a spread of seeds at every size on the level-of-detail
 * ramp.
 *
 * This is the test that catches a reordered `random()` call — the one change
 * that silently re-rolls every avatar already rendered in a shipped app while
 * every other test stays green. Regenerate the fixtures only as a deliberate,
 * major-version decision, never to make a failing build pass.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { buildMeshScene, clearSceneCache } from "../src/scene.ts";

type Frozen = {
	seed: number | string;
	palette: string[];
	background: string;
	spots: Array<[number, number, number, number]>;
	highlight: [number, number, number];
};

const FIXTURES: Record<string, Frozen[]> = JSON.parse(
	readFileSync(path.join(import.meta.dirname, "fixtures-scene.json"), "utf8"),
);

/** Fixtures store string seeds prefixed, so `42` and `"42"` stay distinguishable. */
const decode = (seed: number | string) =>
	typeof seed === "string" && seed.startsWith("s:") ? seed.slice(2) : seed;

const round = (n: number) => Number(n.toFixed(6));

describe("frozen scene geometry", () => {
	for (const [size, expected] of Object.entries(FIXTURES)) {
		it(`is unchanged at size ${size}`, () => {
			for (const frozen of expected) {
				const seed = decode(frozen.seed);
				clearSceneCache();
				const scene = buildMeshScene(seed, Number(size));
				const where = `seed ${JSON.stringify(seed)} @ ${size}`;

				assert.deepEqual(scene.palette, frozen.palette, `${where}: palette`);
				assert.equal(scene.background, frozen.background, `${where}: background`);
				assert.equal(
					scene.spots.length,
					frozen.spots.length,
					`${where}: spot count`,
				);

				for (let i = 0; i < frozen.spots.length; i++) {
					const [x, y, radius, colorIndex] = frozen.spots[i];
					const spot = scene.spots[i];
					assert.deepEqual(
						[round(spot.x), round(spot.y), round(spot.radius), spot.colorIndex],
						[x, y, radius, colorIndex],
						`${where}: spot ${i}`,
					);
					assert.equal(
						spot.color,
						scene.palette[spot.colorIndex],
						`${where}: spot ${i} colour must come from the palette`,
					);
				}

				assert.deepEqual(
					[
						round(scene.highlight.x),
						round(scene.highlight.y),
						round(scene.highlight.radius),
					],
					frozen.highlight,
					`${where}: highlight`,
				);
			}
		});
	}

	it("covers the whole level-of-detail ramp", () => {
		const sizes = Object.keys(FIXTURES).map(Number);
		assert.ok(Math.min(...sizes) <= 16, "must include the simplest end");
		assert.ok(Math.max(...sizes) >= 160, "must include full detail");
	});
});
