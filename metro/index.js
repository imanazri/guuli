/**
 * Metro config helper for consuming Randos from a local path.
 *
 * Installing from npm needs none of this. It is for `file:` links, `npm link`
 * and workspaces, where the package directory keeps its own `node_modules` —
 * holding the copies of `react`, `react-native` and `react-native-svg` it
 * installs to typecheck and test itself. Metro then resolves those *as well as*
 * your app's, loads each library twice, and the second copy fails to register
 * its native views:
 *
 *     Tried to register two views with the same name RNSVGCircle
 *     TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found
 *
 * Neither message mentions resolution, which is what makes this expensive to
 * debug. `metro.config.js`:
 *
 * ```js
 * const { getDefaultConfig } = require("expo/metro-config");
 * const { withRandos } = require("randos/metro");
 *
 * module.exports = withRandos(getDefaultConfig(__dirname));
 * ```
 *
 * If you linked the package's *source* rather than a packed tarball, tell it
 * where, so Metro watches that directory for changes too:
 *
 * ```js
 * module.exports = withRandos(getDefaultConfig(__dirname), {
 *   linkedRoot: path.resolve(__dirname, "../randos"),
 * });
 * ```
 */

const path = require("node:path");

/**
 * Libraries that must resolve to exactly one copy. Each registers native views
 * or holds module-level state, so a second copy is not a duplicate so much as a
 * competing installation.
 */
const SINGLETONS = ["react", "react-native", "react-native-svg"];

/**
 * @param {object} config  a Metro config, usually from `getDefaultConfig`
 * @param {{ projectRoot?: string, linkedRoot?: string, singletons?: string[] }} [options]
 * @returns {object} the same config, with resolution pinned to one copy each
 */
function withRandos(config, options = {}) {
	const projectRoot =
		options.projectRoot ?? config.projectRoot ?? process.cwd();
	const singletons = options.singletons ?? SINGLETONS;
	const appModules = path.resolve(projectRoot, "node_modules");

	config.resolver = config.resolver ?? {};

	if (options.linkedRoot) {
		const linkedRoot = path.resolve(options.linkedRoot);
		config.watchFolders = [...(config.watchFolders ?? []), linkedRoot];
		config.resolver.nodeModulesPaths = [
			...new Set([
				...(config.resolver.nodeModulesPaths ?? []),
				appModules,
				path.resolve(linkedRoot, "node_modules"),
			]),
		];
	}

	// `extraNodeModules` cannot do this job: it is a fallback for specifiers
	// that failed to resolve, not an override for ones that resolved to the
	// wrong copy. Only `resolveRequest` can redirect a request that succeeds.
	const previous = config.resolver.resolveRequest;

	config.resolver.resolveRequest = (context, moduleName, platform) => {
		const singleton = singletons.find(
			(name) => moduleName === name || moduleName.startsWith(`${name}/`),
		);
		if (singleton) {
			// Keep any subpath: `react-native/Libraries/...` has to stay intact.
			const target = path.join(
				appModules,
				singleton,
				moduleName.slice(singleton.length),
			);
			return context.resolveRequest(context, target, platform);
		}
		return (previous ?? context.resolveRequest)(context, moduleName, platform);
	};

	return config;
}

module.exports = { withRandos, SINGLETONS };
