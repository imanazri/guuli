// Resolvers that honour package.json "exports" never read this file; it is here
// for any bundler that predates that support and looks for <pkg>/crypto.js.
module.exports = require("./dist/crypto.cjs");
