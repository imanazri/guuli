/**
 * Parity against the real `@outpacelabs/avatars`.
 *
 * The golden palettes in engine.test.ts prove the colours match. This proves
 * the *layout* matches: it runs the actual published web renderer against a
 * recording stub context -- no canvas needed, since all we want is the sequence
 * of shapes it asks for -- and checks our scene describes the same shapes in
 * the same order.
 *
 * This is the test that would catch a reordered `random()` call, which is the
 * one mistake in this port that silently changes every avatar in the app.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	drawMeshGradient,
	generatePalette as referencePalette,
} from "@outpacelabs/avatars";
import { generatePalette } from "../src/engine.ts";
import { FRAME } from "../src/scene.ts";
import { buildMeshScene } from "../src/scene.ts";

interface RecordedGradient {
	x: number;
	y: number;
	radius: number;
	stops: Array<[number, string]>;
}

/**
 * The narrowest thing `drawMeshGradient` will accept: it only ever sets fills,
 * fills rects, and asks for radial gradients. We keep the gradients.
 */
function record(seed: string | number, displaySize: number): RecordedGradient[] {
	const gradients: RecordedGradient[] = [];
	const ctx = {
		fillStyle: "" as unknown,
		globalCompositeOperation: "source-over" as unknown,
		fillRect() {},
		createRadialGradient(
			x0: number,
			y0: number,
			_r0: number,
			_x1: number,
			_y1: number,
			r1: number,
		) {
			const g: RecordedGradient = { x: x0, y: y0, radius: r1, stops: [] };
			gradients.push(g);
			return {
				addColorStop(offset: number, color: string) {
					g.stops.push([offset, color]);
				},
			};
		},
	};
	// Draw in our normalised frame so coordinates compare directly, and pass the
	// real on-screen size so the level-of-detail ramp behaves as it would in the
	// web component.
	drawMeshGradient(ctx, seed, FRAME, { displaySize });
	return gradients;
}

const SEEDS: Array<string | number> = [
	"jane@example.com",
	"acme",
	"outpace",
	"0",
	"",
	42,
	0,
	1,
	999999999,
	"user-1",
	"user-2",
	"a-rather-long-seed-value-with-punctuation!@#",
];
const SIZES = [16, 24, 32, 40, 64, 96, 160, 256];

describe("layout parity with @outpacelabs/avatars", () => {
	for (const size of SIZES) {
		it(`matches spot geometry at size ${size}`, () => {
			for (const seed of SEEDS) {
				const recorded = record(seed, size);
				const scene = buildMeshScene(seed, size);
				const label = `seed ${JSON.stringify(seed)} @ ${size}`;

				// The reference emits one gradient per kept spot, then the highlight.
				assert.equal(
					recorded.length,
					scene.spots.length + 1,
					`${label}: spot count`,
				);

				for (let i = 0; i < scene.spots.length; i++) {
					const want = recorded[i];
					const got = scene.spots[i];
					assert.ok(
						Math.abs(want.x - got.x) < 1e-9 &&
							Math.abs(want.y - got.y) < 1e-9 &&
							Math.abs(want.radius - got.radius) < 1e-9,
						`${label}: spot ${i} geometry, want ${JSON.stringify(want)} got ${JSON.stringify(got)}`,
					);
					// The reference encodes colour + alpha as #RRGGBBAA; the base hex
					// is the first 7 characters.
					assert.equal(
						want.stops[0][1].slice(0, 7),
						got.color,
						`${label}: spot ${i} colour`,
					);
				}

				const wantHighlight = recorded[recorded.length - 1];
				assert.ok(
					Math.abs(wantHighlight.x - scene.highlight.x) < 1e-9 &&
						Math.abs(wantHighlight.y - scene.highlight.y) < 1e-9 &&
						Math.abs(wantHighlight.radius - scene.highlight.radius) < 1e-9,
					`${label}: highlight, want ${JSON.stringify(wantHighlight)} got ${JSON.stringify(scene.highlight)}`,
				);
			}
		});
	}

	it("the background is the reference's base fill", () => {
		for (const seed of SEEDS) {
			const scene = buildMeshScene(seed, 160);
			assert.equal(scene.background, referencePalette(seed).colors[0]);
		}
	});
});

describe("palette parity with @outpacelabs/avatars", () => {
	it("agrees on 2000 arbitrary seeds", () => {
		for (let i = 0; i < 1000; i++) {
			for (const seed of [i, `user-${i}`]) {
				assert.deepEqual(
					generatePalette(seed),
					referencePalette(seed),
					`seed ${JSON.stringify(seed)}`,
				);
			}
		}
	});
});
