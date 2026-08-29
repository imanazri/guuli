# Guuli

Deterministic generative gradient avatars for React Native and Expo. Give it a
user id, an email, anything — it paints a unique mesh gradient. The same seed
always produces the same avatar, so **there is no image to store, upload,
migrate, or fetch**.

- **Deterministic.** A user id *is* the avatar. No CDN, no upload pipeline, no broken images.
- **Small.** 4.4 kB gzipped in a release bundle, zero runtime dependencies.
- **Works in Expo Go.** `react-native-svg` is the only peer, and Expo already bundles it.
- **Legible at every size.** A 24 px avatar is drawn simpler than a 160 px one, on purpose.
- **Typed**, and works on react-native-web too.

## Install

```sh
npx expo install guuli react-native-svg
```

Peers: `react >= 18`, `react-native >= 0.79`, `react-native-svg >= 13`.

## Usage

```tsx
import { GradientAvatar } from "guuli";

function UserAvatar({ user }) {
  return <GradientAvatar seed={user.id} size={40} />;
}
```

That's the whole API for most apps. A few more:

```tsx
<GradientAvatar seed="jane@example.com" size={96} />            {/* circle (default) */}
<GradientAvatar seed="jane@example.com" size={96} radius={16} /> {/* rounded square */}
<GradientAvatar seed="jane@example.com" size={96} radius={0} />  {/* square */}
<GradientAvatar seed={42} size={64} style={{ borderWidth: 2, borderColor: "#fff" }} />
<GradientAvatar seed={user.id} size={40} accessibilityLabel={`${user.name}'s avatar`} />
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `seed` | `string \| number` | — | Any value. Each unique seed is a unique gradient. |
| `size` | `number` | `32` | Rendered size in px. Also sets the level of detail. |
| `radius` | `number` | `size / 2` | Corner radius. Defaults to a circle; `0` for a square. |
| `style` | `StyleProp<ViewStyle>` | — | Merged onto the wrapper, for margins, borders, shadows. |
| `accessibilityLabel` | `string` | — | Announced by screen readers. Omit and the avatar is hidden from them. |
| `testID` | `string` | — | |

### Complexity follows the size

An avatar is drawn for the size it's shown at. A 24 px avatar in a comment
thread gets a couple of colours and a few big shapes, so it reads as one clean
mark instead of a muddy blob; a 160 px profile picture gets the full palette and
all the detail. Same seed, same avatar, just fewer parts when small. The `size`
prop drives this — there is nothing to configure.

```tsx
<GradientAvatar seed="studio" size={24} />  {/* simple: 2 colours, big shapes */}
<GradientAvatar seed="studio" size={160} /> {/* full detail */}
```

### Just the colours

The palette engine is exported, for when you want the colours without the
avatar — a gradient header, a chart series, a tinted card.

```ts
import { generatePalette, seedFromString } from "guuli";

const { colors, harmony } = generatePalette("jane@example.com");
// → { colors: ["#BD59F2", "#FBB42C", "#58FDC4"], harmony: "triadic", seed: 2231369329 }
```

| Helper | Description |
|---|---|
| `generatePalette(seed)` | The colours and harmony rule behind a seed. |
| `seedFromString(input)` / `toSeed(seed)` | The hashing that turns any value into a numeric seed. |
| `buildMeshScene(seed, displaySize)` | The full layout as plain data, if you want to render it yourself. |

## Linking the package locally

Installing from npm needs nothing extra. But if you consume Guuli from a
local path — a `file:` dependency, `npm link`, or a workspace — add one line to
`metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withGuuli } = require("guuli/metro");

module.exports = withGuuli(getDefaultConfig(__dirname));
```

Without it you will hit one of these, usually at startup:

```
Tried to register two views with the same name RNSVGCircle
TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found
```

Neither message mentions module resolution, which is what makes them expensive
to debug. The cause is that a linked package keeps its own `node_modules` — 
holding the copies of `react`, `react-native` and `react-native-svg` this
package installs to typecheck and test itself. Metro resolves those *as well
as* your app's and loads each library twice; the second copy then fails to
register its native views. `withGuuli` pins all three to your app's copy.

If you linked the package's source rather than a packed tarball, say where, so
Metro watches it for changes:

```js
module.exports = withGuuli(getDefaultConfig(__dirname), {
  linkedRoot: path.resolve(__dirname, "../guuli"),
});
```

## Crypto addresses

If you seed on a blockchain address, import `seedForAddress` and use it. It is
a separate entry point, so it costs nothing (0.4 kB gzipped) unless you do:

```tsx
import { GradientAvatar } from "guuli";
import { seedForAddress } from "guuli/crypto";

<GradientAvatar seed={seedForAddress(account.address)} size={40} />
```

Without it, **one address renders several different avatars**. An explorer
displays EIP-55 checksummed hex while its API returns lowercase, and a Bitcoin
QR code encodes bech32 in uppercase — so the same account gets a different face
depending on which code path drew it.

Lowercasing everything is not the fix. Solana and legacy Bitcoin addresses are
base58, where case is part of the value and lowercasing yields a *different
address*. So only the provably case-insensitive formats are touched:

| Format | Case | Treatment |
|---|---|---|
| EVM `0x…` — addresses, tx and block hashes | insensitive; EIP-55 is a checksum written into the casing | lowercased |
| BTC bech32 `bc1…` / `tb1…` / `bcrt1…`, incl. taproot | insensitive; mixed case is *invalid* per BIP-173 | lowercased |
| Solana base58 | **significant** | untouched |
| BTC legacy `1…` / `3…` base58 | **significant** | untouched |
| Anything else | — | untouched |

Unrecognised input is returned as-is, so it is always safe to call and never
throws. The same address gives the same avatar on every chain — an address is
one identity whether you are viewing it on Ethereum, Polygon, or Arbitrum.

### Seed on the address, not on an ENS name

A name is a label on an account, not the account. Names can be changed, and
they expire and get re-registered — so a name-keyed avatar would hand the
previous owner's exact face to whoever registers it next, which in an explorer
is an impersonation vector rather than a cosmetic problem. Seeding on the
address also means an account looks the same whether or not reverse resolution
happened to land.

In an explorer this costs nothing: names are resolved *from* addresses, so you
already hold the address.

### A useful side effect

Address-poisoning attacks mint an address sharing the victim's first and last
few characters, which is all a truncated UI shows. Those collide as text and
not at all as avatars — eight lookalikes of `0xd8da…6045` produce eight
obviously different marks.

## Size

Measured by differencing four production Android bundles (`expo export`,
Hermes), so these are what actually lands in a shipped app rather than the
size of the files on disk.

| | raw | gzipped |
|---|---:|---:|
| Guuli core | 9.2 kB | **4.4 kB** |
| `guuli/crypto` | 0.9 kB | 0.4 kB |
| **total** | **10.1 kB** | **4.8 kB** |
| `react-native-svg` | 181.9 kB | 65.4 kB |

If your app already uses `react-native-svg` — charts, icons, QR codes — Guuli
costs 4.8 kB gzipped and nothing else. If it does not, budget for the library
too, including the native code it compiles into your binary (not measured here;
it is zero in Expo Go).

## Performance

Measured on an Android emulator running a **development** bundle in Expo Go —
a release build is meaningfully faster, so read these as a ceiling.

| | |
|---|---|
| Layout math, uncached | 23 µs per avatar (Hermes) · 3.6 µs (V8) |
| Layout math, cached | 1.5 µs per avatar |
| Mount, per avatar @40px | 3.7 ms — against 0.7 ms for a bare `<Svg>` and 0.2 ms for a plain `<View>` |
| Scrolling a 200-row list | no measurable difference from plain `<View>` rows |
| Bundle | 4.4 kB gzipped, plus 65 kB for `react-native-svg` if you do not already have it |

Mounting is the whole cost, and it is node count: `react-native-svg` makes a
real view out of every `<Stop>`. That is why a scene exposes its `palette` and
spots reference it by index — one gradient is defined per *colour* rather than
per spot, which is 43–53% fewer nodes since a palette is two to four colours
and a mesh is up to nine spots. Once mounted, avatars are free: a `FlatList`
scrolls them exactly as fast as flat-coloured circles.

If you render a very large grid at once, mount cost is what you will feel;
`FlatList`/`FlashList` windowing avoids it by construction.

## How the softness works

React Native has no Canvas2D and no CSS filters, and `react-native-svg`'s
`<FeGaussianBlur>` renders differently on iOS than on Android — so the blur that
gives a mesh gradient its softness cannot be applied at render time.

It is baked into the gradient stops instead. `scripts/derive-stops.ts`
convolves the alpha ramp with the same Gaussian offline and ships the result as
a stop table, which is why a spot is drawn past its nominal radius (the blur
carries colour beyond the edge) and why the ramp peaks at 0.93 rather than 1 (a
blur pulls a peak down). The two platforms then render identically: measured
across 62,000 samples of the same avatar, mean channel difference 1.17/255.

## Development

```sh
npm install
npm test          # goldens, frozen geometry, scene, component, metro helper
npm run typecheck
npm run build
```

`npm test` freezes both the palettes and the scene geometry against captured
fixtures. Those are the tests that catch a reordered `random()` call — the one
change that silently re-rolls every avatar already rendered in a shipped app
while everything else stays green. Regenerate them only as a deliberate major
version bump, never to make a failing build pass.

Rendering is checked against frozen geometry rather than by eye, so the suite
runs anywhere with no simulator. To look at real output on a device, point any
Expo app at the built package with `withGuuli` in its Metro config — see
[Linking the package locally](#linking-the-package-locally).

## License

[MIT](./LICENSE).
