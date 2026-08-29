import { defineConfig } from "tsup";

export default defineConfig({
	// Two entries, not one with a re-export: Metro does not tree-shake, so a
	// named export from the root would land in every consumer's bundle whether
	// or not they import it. A separate entry is a separate module graph.
	entry: { index: "src/index.ts", crypto: "src/crypto.ts" },
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
	treeshake: true,
	// Everything the consumer already has. Nothing else is bundled, because
	// there is nothing else: the package has no runtime dependencies.
	external: ["react", "react/jsx-runtime", "react-native", "react-native-svg"],
});
