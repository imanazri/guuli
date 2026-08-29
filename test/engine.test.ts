/**
 * The palette math is pure, so the part users depend on -- "the same seed
 * always renders the same avatar" -- is testable in Node with no RN runtime.
 *
 * The golden table is captured from `@outpacelabs/avatars@0.6.0`, the published
 * reference, for the same seeds its own test suite uses. It is the proof that
 * this port is faithful: a seed must produce the same colours here as it does
 * on the web. If these fail, the port is wrong and nothing else matters.
 *
 * It is also a freeze. These are avatars users have already seen; changing any
 * of them re-rolls every avatar in every app that shipped this. That is a major
 * version bump, never a refactor.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detailFor,
	generatePalette,
	type Harmony,
	paletteForDetail,
	seedFromString,
	toSeed,
} from "../src/engine.ts";

const GOLDEN: Array<{
	input: string | number;
	seed: number;
	harmony: Harmony;
	colors: string[];
}> = [
	{
		input: "jane@example.com",
		seed: 2231369329,
		harmony: "triadic",
		colors: ["#BD59F2", "#FBB42C", "#58FDC4"],
	},
	{
		input: "acme",
		seed: 2281398667,
		harmony: "complementary",
		colors: ["#F8A940", "#1973EA", "#F2DC0F", "#4253EC"],
	},
	{
		input: 42,
		seed: 42,
		harmony: "tetradic",
		colors: ["#F36388", "#C0F51C", "#29F2BE", "#8560F7"],
	},
	{
		input: 0,
		seed: 0,
		harmony: "triadic",
		colors: ["#E23434", "#46E946", "#4A4AF4"],
	},
	{
		input: "outpace",
		seed: 1754654890,
		harmony: "tetradic",
		colors: ["#21C1FE", "#C409F9", "#F9652C", "#56E72C"],
	},
	{
		input: "0",
		seed: 1684187033,
		harmony: "complementary",
		colors: ["#D225F4", "#7AEF62", "#E94ECF", "#21E141"],
	},
];

const HARMONIES: Harmony[] = [
	"analogous",
	"triadic",
	"splitComplementary",
	"tetradic",
	"complementary",
];

describe("golden palettes (parity with @outpacelabs/avatars)", () => {
	for (const g of GOLDEN) {
		it(`${JSON.stringify(g.input)} is stable`, () => {
			const p = generatePalette(g.input);
			assert.equal(p.seed, g.seed);
			assert.equal(p.harmony, g.harmony);
			assert.deepEqual(p.colors, g.colors);
		});
	}
});

describe("determinism", () => {
	it("repeated calls agree", () => {
		for (const seed of ["a", "bb", "user-42", 7, 123456789]) {
			assert.deepEqual(generatePalette(seed), generatePalette(seed));
		}
	});

	it("a string routes through the same hash as seedFromString", () => {
		for (const s of ["jane@example.com", "acme", "0", ""]) {
			assert.deepEqual(generatePalette(s), generatePalette(seedFromString(s)));
		}
	});

	it("toSeed passes numbers through and hashes strings", () => {
		assert.equal(toSeed(42), 42);
		assert.equal(toSeed("acme"), seedFromString("acme"));
	});
});

describe("shape", () => {
	it("colors are valid #RRGGBB and harmonies are known", () => {
		for (let i = 0; i < 500; i++) {
			const p = generatePalette(`seed-${i}`);
			assert.ok(HARMONIES.includes(p.harmony), p.harmony);
			assert.ok(p.colors.length >= 3);
			for (const c of p.colors) {
				assert.match(c, /^#[0-9A-F]{6}$/, `${c} from seed-${i}`);
			}
		}
	});
});

describe("spread", () => {
	it("distinct seeds produce distinct palettes", () => {
		const seen = new Set<string>();
		for (let i = 0; i < 1000; i++) {
			seen.add(generatePalette(`user-${i}`).colors.join(","));
		}
		// Collisions are possible in principle; in practice near-zero.
		assert.ok(seen.size > 990, `only ${seen.size}/1000 unique`);
	});
});

describe("level of detail", () => {
	it("detailFor ramps 0 at the small end to 1 at the large end", () => {
		assert.equal(detailFor(16), 0);
		assert.equal(detailFor(8), 0);
		assert.equal(detailFor(160), 1);
		assert.equal(detailFor(512), 1);
		const mid = detailFor(50);
		assert.ok(mid > 0 && mid < 1, String(mid));
		// Monotonic.
		assert.ok(detailFor(24) < detailFor(48));
		assert.ok(detailFor(48) < detailFor(96));
	});

	it("detailFor is full detail for a nonsense size", () => {
		assert.equal(detailFor(0), 1);
		assert.equal(detailFor(-1), 1);
		assert.equal(detailFor(Number.NaN), 1);
	});

	it("paletteForDetail keeps a prefix, never reorders", () => {
		const colors = ["#111111", "#222222", "#333333", "#444444"];
		assert.deepEqual(paletteForDetail(colors, 0), colors.slice(0, 2));
		assert.deepEqual(paletteForDetail(colors, 1), colors);
		const mid = paletteForDetail(colors, 0.5);
		assert.deepEqual(mid, colors.slice(0, mid.length));
		assert.ok(mid.length >= 2 && mid.length <= 4);
	});

	it("paletteForDetail never drops below MIN_COLORS", () => {
		assert.deepEqual(paletteForDetail(["#111111", "#222222"], 0), [
			"#111111",
			"#222222",
		]);
	});
});
