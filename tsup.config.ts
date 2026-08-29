import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "src/index.ts" },
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
	treeshake: true,
	// Everything the consumer already has. Nothing else is bundled, because
	// there is nothing else: the package has no runtime dependencies.
	external: ["react", "react/jsx-runtime", "react-native", "react-native-svg"],
});
