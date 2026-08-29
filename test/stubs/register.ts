/**
 * Redirects the two peer dependencies to the stubs in this directory.
 *
 * `react-native` and `react-native-svg` need a device to do anything real, and
 * their published entry points are CommonJS, which `mock.module` cannot replace
 * once they are installed. A resolve hook sidesteps both problems: it swaps the
 * specifier before the real package is ever loaded.
 *
 * Loaded via `--import` so it is in place before any test imports the component.
 */
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const STUBS: Record<string, string> = {
	"react-native": "./react-native.tsx",
	"react-native-svg": "./react-native-svg.tsx",
};

registerHooks({
	resolve(specifier, context, nextResolve) {
		const stub = STUBS[specifier];
		if (!stub) return nextResolve(specifier, context);
		return nextResolve(stub, {
			...context,
			parentURL: import.meta.url,
		});
	},
});

// Silences an unused-import warning in editors; also proves the path resolves.
void fileURLToPath(import.meta.url);

// react-test-renderer refuses to flush inside `act` without this.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
	true;
