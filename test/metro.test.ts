/**
 * `withRandos` is a shipped export with a job that only shows up on a device:
 * it stops a linked copy of the package from loading a second react-native-svg.
 * When it is wrong the app dies at startup with "Tried to register two views
 * with the same name RNSVGCircle", which names nothing that would lead you here.
 *
 * It has already broken once in a way no type check caught -- it used
 * `module.exports` in a `"type": "module"` package, so `require` of it threw.
 * These tests exercise it the way a metro.config.js does: through `require`.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";

const require = createRequire(import.meta.url);
// Loaded exactly as a consumer's CommonJS metro.config.js would load it.
const { withRandos, SINGLETONS } = require("../metro/index.js");

const APP = "/app";
const LINKED = "/pkg";

/** A resolver context, standing in for the one Metro passes through. */
const context = () => {
	const seen: Array<{ moduleName: string }> = [];
	return {
		seen,
		resolveRequest: (_ctx: unknown, moduleName: string) => {
			seen.push({ moduleName });
			return { type: "sourceFile", filePath: moduleName };
		},
	};
};

const configure = (options?: Record<string, unknown>) =>
	withRandos({ projectRoot: APP, resolver: {} }, options);

describe("withRandos", () => {
	it("is requireable from a CommonJS metro.config.js", () => {
		assert.equal(typeof withRandos, "function");
		assert.ok(Array.isArray(SINGLETONS));
	});

	it("installs a resolveRequest hook", () => {
		const config = configure();
		assert.equal(typeof config.resolver.resolveRequest, "function");
	});

	for (const name of ["react", "react-native", "react-native-svg"]) {
		it(`pins ${name} to the app's copy`, () => {
			const config = configure();
			const ctx = context();
			config.resolver.resolveRequest(ctx, name, "ios");
			assert.equal(
				ctx.seen[0].moduleName,
				path.join(APP, "node_modules", name),
			);
		});
	}

	it("keeps subpaths intact", () => {
		// react-native/Libraries/... must not be flattened to react-native.
		const config = configure();
		const ctx = context();
		config.resolver.resolveRequest(ctx, "react-native/Libraries/Text", "ios");
		assert.equal(
			ctx.seen[0].moduleName,
			path.join(APP, "node_modules", "react-native", "/Libraries/Text"),
		);
	});

	it("leaves every other package alone", () => {
		const config = configure();
		for (const name of ["expo", "lodash", "react-native-svg-charts", "./local"]) {
			const ctx = context();
			config.resolver.resolveRequest(ctx, name, "ios");
			assert.equal(ctx.seen[0].moduleName, name, `rewrote ${name}`);
		}
	});

	it("does not match a package that merely starts with a singleton's name", () => {
		// "react-native-svg-charts" begins with "react-native" but is unrelated.
		const config = configure();
		const ctx = context();
		config.resolver.resolveRequest(ctx, "react-native-svg-charts", "ios");
		assert.equal(ctx.seen[0].moduleName, "react-native-svg-charts");
	});

	it("watches the linked package when told where it is", () => {
		const config = configure({ linkedRoot: LINKED });
		assert.deepEqual(config.watchFolders, [LINKED]);
		assert.ok(config.resolver.nodeModulesPaths.includes(path.join(APP, "node_modules")));
		assert.ok(config.resolver.nodeModulesPaths.includes(path.join(LINKED, "node_modules")));
	});

	it("adds no watchFolders when the package is not linked", () => {
		const config = configure();
		assert.equal(config.watchFolders, undefined);
	});

	it("chains a resolveRequest that was already configured", () => {
		let called = false;
		const config = withRandos({
			projectRoot: APP,
			resolver: {
				resolveRequest: (_c: unknown, moduleName: string) => {
					called = true;
					return { type: "sourceFile", filePath: `existing:${moduleName}` };
				},
			},
		});
		const result = config.resolver.resolveRequest(context(), "expo", "ios");
		assert.ok(called, "the existing hook must still run");
		assert.equal(result.filePath, "existing:expo");
	});

	it("honours an explicit projectRoot over the config's", () => {
		const config = withRandos(
			{ projectRoot: "/wrong", resolver: {} },
			{ projectRoot: APP },
		);
		const ctx = context();
		config.resolver.resolveRequest(ctx, "react", "ios");
		assert.equal(ctx.seen[0].moduleName, path.join(APP, "node_modules", "react"));
	});
});
