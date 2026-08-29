# Gulitars

Deterministic generative gradient avatars for React Native and Expo. Give it a
user id, an email, anything — it paints a unique mesh gradient. The same seed
always produces the same avatar, so **there is no image to store, upload,
migrate, or fetch**.

- **Deterministic.** A user id *is* the avatar. No CDN, no upload pipeline, no broken images.
- **Small.** ~2.8 kB gzipped, zero runtime dependencies; 9 kB in a release bundle.
- **Works in Expo Go.** `react-native-svg` is the only peer, and Expo already bundles it.
- **Legible at every size.** A 24 px avatar is drawn simpler than a 160 px one, on purpose.
- **Typed**, and works on react-native-web too.

A port of [`@outpacelabs/avatars`](https://github.com/outpacelabs/avatars) by
Outpace Studios, whose palette engine it reproduces exactly — the same seed
gives the same colours on both.

## Install

```sh
npx expo install gulitars react-native-svg
```

Peers: `react >= 18`, `react-native >= 0.79`, `react-native-svg >= 13`.

## Usage

```tsx
import { GradientAvatar } from "gulitars";

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
import { generatePalette, seedFromString } from "gulitars";

const { colors, harmony } = generatePalette("jane@example.com");
// → { colors: ["#BD59F2", "#FBB42C", "#58FDC4"], harmony: "triadic", seed: 2231369329 }
```

| Helper | Description |
|---|---|
| `generatePalette(seed)` | The colours and harmony rule behind a seed. |
| `seedFromString(input)` / `toSeed(seed)` | The hashing that turns any value into a numeric seed. |
| `buildMeshScene(seed, displaySize)` | The full layout as plain data, if you want to render it yourself. |

## Linking the package locally

Installing from npm needs nothing extra. But if you consume Gulitars from a
local path — a `file:` dependency, `npm link`, or a workspace — add one line to
`metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withGulitars } = require("gulitars/metro");

module.exports = withGulitars(getDefaultConfig(__dirname));
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
register its native views. `withGulitars` pins all three to your app's copy.

If you linked the package's source rather than a packed tarball, say where, so
Metro watches it for changes:

```js
module.exports = withGulitars(getDefaultConfig(__dirname), {
  linkedRoot: path.resolve(__dirname, "../gulitars"),
});
```

## Crypto addresses

If you seed on a blockchain address, import `seedForAddress` and use it. It is
a separate entry point, so it costs nothing (319 B gzipped) unless you do:

```tsx
import { GradientAvatar } from "gulitars";
import { seedForAddress } from "gulitars/crypto";

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

## Performance

Measured on an Android emulator running a **development** bundle in Expo Go —
a release build is meaningfully faster, so read these as a ceiling.

| | |
|---|---|
| Layout math, uncached | 23 µs per avatar (Hermes) · 3.6 µs (V8) |
| Layout math, cached | 1.5 µs per avatar |
| Mount, per avatar @40px | 3.7 ms — against 0.7 ms for a bare `<Svg>` and 0.2 ms for a plain `<View>` |
| Scrolling a 200-row list | no measurable difference from plain `<View>` rows |
| Bundle | 9 kB, plus 178 kB for `react-native-svg` if you do not already have it |

Mounting is the whole cost, and it is node count: `react-native-svg` makes a
real view out of every `<Stop>`. That is why a scene exposes its `palette` and
spots reference it by index — one gradient is defined per *colour* rather than
per spot, which is 43–53% fewer nodes since a palette is two to four colours
and a mesh is up to nine spots. Once mounted, avatars are free: a `FlatList`
scrolls them exactly as fast as flat-coloured circles.

If you render a very large grid at once, mount cost is what you will feel;
`FlatList`/`FlashList` windowing avoids it by construction.

## Differences from `@outpacelabs/avatars`

Palettes and layout are **identical** — that's enforced by a test suite that
runs the published web package side by side with this one and compares spot
geometry and colours across thousands of seeds. What differs is the rendering,
because React Native has no Canvas2D and no CSS filters:

- **SVG, not canvas.** Each spot is a `<RadialGradient>` on a `<Circle>` rather than a canvas fill.
- **No Gaussian blur.** The web version blurs the finished canvas. `react-native-svg`'s `<FeGaussianBlur>` renders differently on iOS than on Android, so instead the softness is baked into the gradient stops: the original's four linear alpha stops are resampled along a monotone cubic through the same control points, which reproduces what the blur actually does at this scale (see `scripts/derive-stops.ts`). The upshot is a crisp avatar edge instead of the web version's slightly faded rim.
- **Mesh only.** No `pattern="dither"`.
- **No `colors` override**, no Display P3, no image export (`gradientToDataURL` / `gradientToBlob`) — none of which have a React Native equivalent worth the weight.

## Development

```sh
npm install
npm test          # engine goldens, layout parity, scene, component
npm run typecheck
npm run build
```

`npm test` includes a parity suite that installs the real `@outpacelabs/avatars`
and asserts this port matches it. If the reference ships a new palette version,
that suite is what tells you — and changing our output to match is a **major**
version bump here, because it re-rolls every avatar already in the wild.

To see it on a device:

```sh
npm run build            # the example consumes dist/
cd example && npm install && npm start
```

The example targets the newest Expo SDK in the supported range, so it works
with whatever Expo Go you already have; the package itself only needs RN 0.79.

There is also a visual harness that renders this package's output next to the
real web component in a browser, seed for seed. This is how the gradient stops
were tuned, and it is the fastest way to check a change to them:

```sh
node --import tsx scripts/compare.ts   # prints the directory and serve command
```

## License

[MIT](./LICENSE). The engine is derived from
[`@outpacelabs/avatars`](https://github.com/outpacelabs/avatars) (MIT,
© Outpace Studios).
