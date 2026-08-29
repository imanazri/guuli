# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Note that **avatar output is part of the public API**. A seed that renders one
avatar today must render the same one after any patch or minor release —
changing the palette or the layout re-rolls avatars users have already seen, so
it is a major version bump, never a fix. The frozen palette and geometry
fixtures in `test/` exist to make that impossible to do by accident.

## [Unreleased]

### Added

- `GradientAvatar` — deterministic mesh-gradient avatars for React Native and Expo.
- `randos/crypto` — `seedForAddress`, a canonical seed for blockchain
  addresses. Normalises the formats whose case is not significant (EVM hex,
  Bitcoin bech32) and leaves base58 alone, so one address is one avatar however
  it is cased.
- `randos/metro` — `withRandos`, a Metro config helper that pins `react`,
  `react-native` and `react-native-svg` to one copy. Needed only when consuming
  the package from a local path.
- `generatePalette`, `seedFromString`, `toSeed` and `buildMeshScene` for driving
  the engine directly.
