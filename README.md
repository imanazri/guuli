# Guuli

Give it a user ID. Get a beautiful, consistent avatar. Every time.

```tsx
import { GradientAvatar } from "guuli";

<GradientAvatar seed={user.id} size={40} />
```

That's it. No image to upload, no CDN to configure, no S3 bucket, no broken
`<img>` fallback at 2am. The avatar *is* the ID — the same seed paints the same
gradient forever, on every device, offline.

- **4.5 kB gzipped**, zero runtime dependencies
- **Works in Expo Go** — `react-native-svg` is the only peer, and Expo already bundles it
- **Reads well at 24 px** — small avatars are drawn simpler on purpose, not scaled down
- **Built for crypto apps** — one address, one avatar, whatever casing it arrives in
- Fully typed, works on react-native-web

## Install

```sh
npm install guuli react-native-svg
```

**Bare React Native?** Link the native side for iOS. Android autolinks itself:

```sh
cd ios && pod install
```

**Expo?** Let the Expo CLI pick the versions:

```sh
npx expo install guuli react-native-svg
```

Already using `react-native-svg` for charts or icons? Then you only need `guuli`.

<details>
<summary>Why two different commands</summary>

`react-native-svg` ships native code, and its JavaScript has to match the
binary that code was compiled into. Where that binary comes from decides which
command you want:

- **Bare RN, and Expo dev builds** compile it from your `node_modules` at build
  time. Whatever version you install is the version that gets built, so they
  can't disagree. `npm install` is fine; `pod install` is what compiles it.
- **Expo Go** ships a prebuilt binary with a fixed set of libraries, so your
  JavaScript has to match the version that SDK shipped. `npx expo install`
  reads that from the SDK and pins it. Plain `npm install` grabs the newest
  release matching `>=13`, which is usually a version no SDK ships.

Get it wrong and you'll see `TurboModuleRegistry.getEnforcing('PlatformConstants')`
or `Tried to register two views with the same name RNSVGCircle` — neither of
which mentions a version, which is what makes it annoying to track down.

`react-native-svg` is a *peer* dependency so your app keeps exactly one copy of
it. As a regular dependency, npm could nest a second copy under `guuli/`, and
two copies of a native module is that registration crash, permanently.

</details>

## Usage

The one-liner covers most apps:

```tsx
<GradientAvatar seed={user.id} size={40} />
```

Shapes and styling:

```tsx
<GradientAvatar seed="jane@example.com" size={96} />             {/* circle (default) */}
<GradientAvatar seed="jane@example.com" size={96} radius={16} /> {/* rounded square */}
<GradientAvatar seed="jane@example.com" size={96} radius={0} />  {/* square */}

<GradientAvatar seed={42} size={64} style={{ borderWidth: 2, borderColor: "#fff" }} />
<GradientAvatar seed={user.id} size={40} accessibilityLabel={`${user.name}'s avatar`} />
```

### Props

| Prop | Type | Default | |
|---|---|---|---|
| `seed` | `string \| number` | — | Any value. Each unique seed is a unique gradient. |
| `size` | `number` | `32` | Rendered size in px. Also sets how detailed the avatar is. |
| `radius` | `number` | `size / 2` | Corner radius. Circle by default; `0` for a square. |
| `style` | `StyleProp<ViewStyle>` | — | Merged onto the wrapper — margins, borders, shadows. |
| `accessibilityLabel` | `string` | — | Announced by screen readers. Omit it and the avatar is hidden from them, which is usually what you want next to a name. |
| `testID` | `string` | — | |

### Small avatars are drawn differently

An avatar knows what size it's shown at. A 24 px one in a comment thread gets a
couple of colours and a few big shapes so it reads as one clean mark; a 160 px
profile picture gets the full palette and every detail.

```tsx
<GradientAvatar seed="studio" size={24} />  {/* 2 colours, big shapes */}
<GradientAvatar seed="studio" size={160} /> {/* full detail */}
```

Same seed, same avatar — just fewer parts when it's small. Shrinking the big
version instead would give you a muddy blob. The `size` prop drives this, so
there's nothing to configure.

## Crypto addresses

If you're seeding on a blockchain address, use `seedForAddress`:

```tsx
import { GradientAvatar } from "guuli";
import { seedForAddress } from "guuli/crypto";

<GradientAvatar seed={seedForAddress(account.address)} size={40} />
```

Here's why it matters. Your UI shows EIP-55 checksummed hex, your API returns
lowercase, and a Bitcoin QR code encodes bech32 in uppercase. Those are the
same address — but as raw strings they're three different seeds, so the same
account gets three different faces depending on which code path drew it.

You can't just lowercase everything, either. Solana and legacy Bitcoin
addresses are base58, where case *is* part of the value — lowercasing gives you
a genuinely different address. So `seedForAddress` only touches the formats
that are provably case-insensitive:

| Format | Case | What happens |
|---|---|---|
| EVM `0x…` — addresses, tx and block hashes | insensitive (EIP-55 is a checksum written into the casing) | lowercased |
| BTC bech32 `bc1…` `tb1…` `bcrt1…`, taproot included | insensitive; mixed case is *invalid* per BIP-173 | lowercased |
| Solana base58 | **significant** | untouched |
| BTC legacy `1…` `3…` | **significant** | untouched |
| Anything else | — | untouched |

Unrecognised input comes back as-is, so it's always safe to call and never
throws. And an address is one identity across chains — the same avatar on
Ethereum, Polygon and Arbitrum.

It's a separate entry point, so it costs you 0.3 kB and only if you import it.

### Seed on the address, not the ENS name

Tempting, but don't. A name is a label on an account, not the account itself.
Names get changed. Names expire and get re-registered — so a name-keyed avatar
hands the previous owner's exact face to whoever grabs the name next. In an
explorer that's an impersonation vector, not a cosmetic wrinkle.

It costs nothing to do the right thing here: ENS names are resolved *from*
addresses, so you're already holding the address.

### A nice side effect

Address-poisoning attacks mint an address that shares the victim's first and
last few characters — which is all a truncated UI shows. `0xd8da…6045` and
`0xd8da…6045` look identical as text.

As avatars they don't. Eight lookalikes produce eight obviously different
marks, so a mismatched avatar catches what the truncated address can't.

## Just the colours

The palette engine is exported too, for gradient headers, chart series, tinted
cards — anywhere you want the colours without the avatar.

```ts
import { generatePalette } from "guuli";

const { colors, harmony } = generatePalette("jane@example.com");
// → { colors: ["#BD59F2", "#FBB42C", "#58FDC4"], harmony: "triadic", seed: 2231369329 }
```

| Helper | |
|---|---|
| `generatePalette(seed)` | The colours and harmony rule behind a seed. |
| `seedFromString(input)` · `toSeed(seed)` | The hashing that turns any value into a numeric seed. |
| `buildMeshScene(seed, displaySize)` | The whole layout as plain data, if you'd rather render it yourself. |

## Size and performance

Measured by differencing production Android bundles, so this is what actually
lands in a shipped app — not the size of the files on disk.

| | raw | gzipped |
|---|---:|---:|
| Guuli core | 8.8 kB | **4.5 kB** |
| `guuli/crypto` | 0.9 kB | 0.3 kB |
| **total** | **9.5 kB** | **4.8 kB** |
| `react-native-svg` | 181.9 kB | 65.4 kB |

If you already ship `react-native-svg`, Guuli costs 4.8 kB and nothing else.

<details>
<summary>Runtime numbers, and where the cost actually is</summary>

From an Android emulator running a **development** bundle in Expo Go. A release
build is meaningfully faster, so treat these as a ceiling.

| | |
|---|---|
| Layout math, uncached | 23 µs per avatar (Hermes) · 3.6 µs (V8) |
| Layout math, cached | 1.5 µs per avatar |
| Mount, per avatar @40px | 3.7 ms — against 0.7 ms for a bare `<Svg>` and 0.2 ms for a plain `<View>` |
| Scrolling a 200-row list | no measurable difference from plain `<View>` rows |

Mounting is the entire cost, and it comes down to node count: `react-native-svg`
turns every `<Stop>` into a real view. That's why a scene exposes its `palette`
and spots reference it by index — one gradient per *colour* instead of one per
spot, which is 43–53% fewer nodes, since a palette is two to four colours
against up to nine spots.

Once mounted, avatars are free. A `FlatList` scrolls them exactly as fast as
flat-coloured circles. If you render a huge grid all at once you'll feel the
mount cost, but `FlatList` and `FlashList` windowing avoid that by design.

</details>

## Developing against a local copy

Installing from npm needs nothing extra. But if you're linking Guuli from a
local path — a `file:` dependency, `npm link`, or a workspace — add one line to
`metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withGuuli } = require("guuli/metro");

module.exports = withGuuli(getDefaultConfig(__dirname));
```

Skip it and you'll hit one of these at startup:

```
Tried to register two views with the same name RNSVGCircle
TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found
```

A linked package keeps its own `node_modules`, which holds the copies of
`react`, `react-native` and `react-native-svg` Guuli installs to typecheck and
test itself. Metro resolves those *as well as* yours, loads each library twice,
and the second copy fails to register its native views. `withGuuli` pins all
three to your app's copy.

Linked the source rather than a packed tarball? Say where, so Metro watches it:

```js
module.exports = withGuuli(getDefaultConfig(__dirname), {
  linkedRoot: path.resolve(__dirname, "../guuli"),
});
```

## How the softness works

Mesh gradients get their look from a blur over the finished frame. React Native
has no Canvas2D and no CSS filters, and `react-native-svg`'s `<FeGaussianBlur>`
renders differently on iOS than on Android — so that blur can't happen at
render time.

It's baked into the gradient stops instead. `scripts/derive-stops.ts` convolves
the alpha ramp with the same Gaussian offline and ships the result as a stop
table. That's why a spot is drawn past its nominal radius (a blur carries
colour beyond the edge) and why the ramp peaks at 0.93 rather than 1 (a blur
pulls a peak down).

The payoff is that both platforms render identically — measured across 62,000
samples of the same avatar, mean channel difference 1.17/255.

## Contributing

```sh
npm install
npm test          # goldens, frozen geometry, scene, component, metro helper
npm run typecheck
npm run build
```

One thing to know before you touch `src/engine.ts` or `src/scene.ts`: **avatar
output is public API.** The tests freeze both the palettes and the scene
geometry against captured fixtures, and they exist to catch a reordered
`random()` call — the one change that silently re-rolls every avatar already
rendered in a shipped app while every other test stays green.

If those fixtures fail, that's the suite doing its job. Regenerate them only as
a deliberate major version bump, never to make a build pass.

Rendering is checked against frozen geometry rather than by eye, so the whole
suite runs anywhere with no simulator.

## License

[MIT](./LICENSE)
