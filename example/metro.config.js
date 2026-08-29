// Metro does not follow a `file:..` dependency out of the project by default,
// so the package root has to be watched explicitly.
//
// That link is a symlink, which creates the real problem here: module
// resolution from inside the package resolves against the *package's* own
// node_modules, and that directory has its own react / react-native /
// react-native-svg installed for typechecking and tests. The app would then
// load two copies of React Native — the symptom is a runtime
// `TurboModuleRegistry.getEnforcing('PlatformConstants')` failure, because the
// JS half no longer matches the native binary it is running against.
//
// `extraNodeModules` does not fix this: it is a fallback for names that failed
// to resolve, not an override for names that resolved to the wrong copy. Only
// `resolveRequest` can redirect a request that would otherwise succeed.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const packageRoot = path.resolve(projectRoot, "..");

/** Packages that must resolve to this app's copy, wherever they are asked for. */
const SINGLETONS = ["react", "react-native", "react-native-svg"];

const config = getDefaultConfig(projectRoot);

config.watchFolders = [packageRoot];

config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(packageRoot, "node_modules"),
];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
	const singleton = SINGLETONS.find(
		(name) => moduleName === name || moduleName.startsWith(`${name}/`),
	);
	if (singleton) {
		// Preserve any subpath: `react-native/Libraries/...` must stay intact.
		const target = path.join(
			projectRoot,
			"node_modules",
			singleton,
			moduleName.slice(singleton.length),
		);
		return context.resolveRequest(context, target, platform);
	}
	return (defaultResolveRequest ?? context.resolveRequest)(
		context,
		moduleName,
		platform,
	);
};

module.exports = config;
