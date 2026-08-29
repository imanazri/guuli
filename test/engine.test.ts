/**
 * The palette math is pure, so the part users depend on -- "the same seed
 * always renders the same avatar" -- is testable in Node with no RN runtime.
 *
 * The golden table is a freeze. These are avatars users have already seen, so
 * changing any of them re-rolls every avatar in every app that shipped this.
 * Regenerate them only as a deliberate major-version decision, never to make a
 * failing build pass.
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
		input: "studio",
		seed: 1736381099,
		harmony: "triadic",
		colors: ["#73A1EF", "#FB5491", "#98FE5C"],
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

describe("golden palettes", () => {
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

describe("seeds that should not arrive but do", () => {
	// TypeScript says `seed` is string | number. Reality disagrees: a list row
	// renders before its record loads, a parse fails, an id comes back null.
	// None of these may throw or emit a colour react-native-svg cannot parse.
	const PATHOLOGICAL = [
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		undefined,
		null,
		true,
		{},
		[],
	];

	it("never throws", () => {
		for (const value of PATHOLOGICAL) {
			assert.doesNotThrow(
				() => generatePalette(value as never),
				`threw on ${String(value)}`,
			);
		}
	});

	it("always yields a finite seed and valid hex", () => {
		for (const value of PATHOLOGICAL) {
			const p = generatePalette(value as never);
			assert.ok(Number.isFinite(p.seed), `non-finite seed for ${String(value)}`);
			for (const c of p.colors) {
				// `#DF20NAN` is what this produced before toSeed guarded itself.
				assert.match(c, /^#[0-9A-F]{6}$/, `${c} from ${String(value)}`);
			}
		}
	});

	it("keeps them distinct from each other", () => {
		const seeds = PATHOLOGICAL.map((v) => toSeed(v as never));
		assert.equal(new Set(seeds).size, seeds.length, "collapsed to one avatar");
	});

	it("agrees with the text each value stringifies to", () => {
		// Which is why an empty array and an empty string share an avatar:
		// `String([])` is `""`. That is the rule working, not a collision.
		assert.equal(toSeed([] as never), toSeed(""));
		assert.equal(toSeed(Number.NaN), toSeed("NaN"));
		assert.equal(toSeed(null as never), toSeed("null"));
	});

	it("does not disturb seeds that are valid", () => {
		assert.equal(toSeed(42), 42);
		assert.equal(toSeed(0), 0);
		assert.equal(toSeed(-42), -42);
		assert.equal(toSeed(3.7), 3.7);
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
