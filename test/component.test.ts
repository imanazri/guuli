/**
 * The renderer's structural contracts.
 *
 * `react-native` and `react-native-svg` are peer dependencies whose real
 * implementations need a device, so they are stubbed with plain host components
 * here. That is enough: what we need to check is the element tree the component
 * builds -- above all that two avatars on one screen do not collide on gradient
 * ids, which is invisible in any single-avatar test and is the classic
 * react-native-svg bug.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import renderer from "react-test-renderer";
import { createElement } from "react";

import { GradientAvatar } from "../src/GradientAvatar.tsx";
import { buildMeshScene } from "../src/scene.ts";

type Node = {
	type: string;
	props: Record<string, unknown>;
	children: Node[] | null;
};

// biome-ignore lint/suspicious/noExplicitAny: test harness
function render(element: any): Node {
	// `toJSON` has to run after `act` returns, not inside it: mid-commit there
	// is nothing to serialise yet and it quietly hands back null.
	let result: renderer.ReactTestRenderer | undefined;
	renderer.act(() => {
		result = renderer.create(element);
	});
	return (result as renderer.ReactTestRenderer).toJSON() as unknown as Node;
}

function walk(node: Node | null, visit: (n: Node) => void): void {
	if (!node || typeof node !== "object") return;
	visit(node);
	for (const child of node.children ?? []) walk(child, visit);
}

function collect(node: Node, type: string): Node[] {
	const out: Node[] = [];
	walk(node, (n) => {
		if (n.type === type) out.push(n);
	});
	return out;
}

describe("GradientAvatar", () => {
	it("renders a background, one circle per spot, and the highlight", () => {
		const tree = render(createElement(GradientAvatar, { seed: "acme", size: 96 }));
		const scene = buildMeshScene("acme", 96);

		assert.equal(collect(tree, "Rect").length, 1, "one opaque base fill");
		assert.equal(
			collect(tree, "Circle").length,
			scene.spots.length + 1,
			"a circle per spot, plus the highlight",
		);
	});

	it("defines one gradient per palette colour, not per spot", () => {
		// This is what keeps a screenful of avatars affordable: in
		// react-native-svg every <Stop> is a real view, so the node count is the
		// cost, and spots outnumber colours two or three to one.
		const tree = render(createElement(GradientAvatar, { seed: "acme", size: 96 }));
		const scene = buildMeshScene("acme", 96);

		assert.ok(scene.spots.length > scene.palette.length, "worth sharing at all");
		assert.equal(
			collect(tree, "RadialGradient").length,
			scene.palette.length + 1,
			"a gradient per colour, plus the highlight",
		);

		// Sharing only works if the gradients are in bounding-box units, so each
		// one re-maps itself onto whichever circle references it. An explicit
		// userSpaceOnUse would pin every spot to one position.
		for (const g of collect(tree, "RadialGradient")) {
			assert.equal(
				g.props.gradientUnits,
				undefined,
				"must inherit the objectBoundingBox default",
			);
		}
	});

	it("points every fill at a gradient that exists", () => {
		const tree = render(createElement(GradientAvatar, { seed: 42, size: 64 }));
		const ids = new Set(
			collect(tree, "RadialGradient").map((g) => g.props.id as string),
		);
		for (const circle of collect(tree, "Circle")) {
			const fill = circle.props.fill as string;
			const referenced = /^url\(#(.+)\)$/.exec(fill)?.[1];
			assert.ok(referenced, `unparseable fill ${fill}`);
			assert.ok(ids.has(referenced), `dangling reference ${fill}`);
		}
	});

	it("gives every avatar on a screen its own gradient ids", () => {
		// The failure this guards against only appears with more than one avatar.
		const tree = render(
			createElement(
				"Screen",
				null,
				createElement(GradientAvatar, { seed: "a", size: 40, key: "a" }),
				createElement(GradientAvatar, { seed: "b", size: 40, key: "b" }),
				createElement(GradientAvatar, { seed: "a", size: 40, key: "c" }),
			),
		);
		const ids = collect(tree, "RadialGradient").map((g) => g.props.id as string);
		assert.equal(new Set(ids).size, ids.length, `collision among ${ids.length}`);
	});

	it("is a circle by default and honours an explicit radius", () => {
		const style = (node: Node) => {
			const flat = (node.props.style as unknown[]).flat(Number.POSITIVE_INFINITY);
			return Object.assign({}, ...flat.filter(Boolean));
		};
		assert.equal(
			style(render(createElement(GradientAvatar, { seed: "a", size: 48 })))
				.borderRadius,
			24,
		);
		assert.equal(
			style(
				render(createElement(GradientAvatar, { seed: "a", size: 48, radius: 0 })),
			).borderRadius,
			0,
			"radius 0 must survive, not fall back to a circle",
		);
		assert.equal(
			style(
				render(
					createElement(GradientAvatar, { seed: "a", size: 48, radius: 12 }),
				),
			).borderRadius,
			12,
		);
	});

	it("clips to the wrapper and sizes both box and canvas", () => {
		const tree = render(createElement(GradientAvatar, { seed: "a", size: 40 }));
		const flat = (tree.props.style as unknown[]).flat(Number.POSITIVE_INFINITY);
		const style = Object.assign({}, ...flat.filter(Boolean));
		assert.equal(style.overflow, "hidden");
		assert.equal(style.width, 40);
		assert.equal(style.height, 40);
		const svg = collect(tree, "Svg")[0];
		assert.equal(svg.props.width, 40);
		assert.equal(svg.props.height, 40);
		assert.equal(svg.props.viewBox, "0 0 100 100");
	});

	it("draws fewer shapes when small", () => {
		const count = (size: number) =>
			collect(
				render(createElement(GradientAvatar, { seed: "studio", size })),
				"Circle",
			).length;
		assert.ok(count(16) < count(160), `${count(16)} vs ${count(160)}`);
	});

	it("hides itself from screen readers unless labelled", () => {
		const bare = render(createElement(GradientAvatar, { seed: "a" }));
		assert.equal(bare.props.accessible, false);
		assert.equal(bare.props.importantForAccessibility, "no-hide-descendants");

		const labelled = render(
			createElement(GradientAvatar, { seed: "a", accessibilityLabel: "Jane" }),
		);
		assert.equal(labelled.props.accessible, true);
		assert.equal(labelled.props.accessibilityLabel, "Jane");
	});
});
