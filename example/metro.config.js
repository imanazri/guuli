// This app links the package by path, so it hits the duplicate-peer-dependency
// problem `withGulitars` exists to solve. Using the shipped helper here rather
// than a local copy means the thing consumers are told to use is the thing that
// is actually exercised on every run.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withGulitars } = require("gulitars/metro");

module.exports = withGulitars(getDefaultConfig(__dirname), {
	linkedRoot: path.resolve(__dirname, ".."),
});
