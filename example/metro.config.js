// Metro does not follow a `file:..` dependency out of the project by default:
// it refuses to watch the parent, and if it did it would find a second copy of
// react / react-native / react-native-svg up there and load two of each.
// So: watch the package root explicitly, and pin every shared dependency to
// this app's copy.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const packageRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [packageRoot];

config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(packageRoot, "node_modules"),
];

// Force the shared peers to this app's copies. Without it, module resolution
// from inside the package directory finds the copies installed up there for
// testing, and the app ends up with two Reacts.
config.resolver.extraNodeModules = {
	...config.resolver.extraNodeModules,
	react: path.resolve(projectRoot, "node_modules/react"),
	"react-native": path.resolve(projectRoot, "node_modules/react-native"),
	"react-native-svg": path.resolve(projectRoot, "node_modules/react-native-svg"),
};

module.exports = config;
