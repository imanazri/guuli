import * as react from 'react';
import { StyleProp, ViewStyle } from 'react-native';

interface GradientAvatarProps {
    /** Any string or number. Each unique seed is a unique gradient, forever. */
    seed: string | number;
    /**
     * Rendered size in px. Also sets the level of detail: a small avatar is
     * drawn with fewer, larger shapes so it reads as one clean mark rather than
     * a muddy blob. Default: 32.
     */
    size?: number;
    /**
     * Corner radius in px. Defaults to a full circle; pass `0` for a square, or
     * e.g. `12` for a rounded square.
     */
    radius?: number;
    /** Merged onto the wrapper, for margins, borders, shadows and the like. */
    style?: StyleProp<ViewStyle>;
    /**
     * Announced by screen readers. Avatars are usually decorative next to a
     * name, so this is off by default and the view is hidden from the
     * accessibility tree.
     */
    accessibilityLabel?: string;
    testID?: string;
}
/**
 * A deterministic mesh-gradient avatar. The same seed always paints the same
 * gradient, so a user id or an email *is* the avatar -- there is no image to
 * store, upload, migrate, or fetch.
 *
 * ```tsx
 * <GradientAvatar seed={user.id} size={40} />
 * ```
 */
declare function GradientAvatarInner({ seed, size, radius, style, accessibilityLabel, testID, }: GradientAvatarProps): react.JSX.Element;
declare const GradientAvatar: react.MemoExoticComponent<typeof GradientAvatarInner>;

/**
 * Palette engine for guuli.
 *
 * Pure math, no renderer, no platform APIs: a seed in, a palette out.
 *
 * Every expression in this file is load-bearing: it decides what each user's
 * avatar looks like. Changing a constant, or reordering a `random()` call,
 * re-rolls every avatar already in the wild. That is a major version bump,
 * never a refactor.
 */
type Harmony = "analogous" | "triadic" | "splitComplementary" | "tetradic" | "complementary";
interface GradientPalette {
    /** The numeric seed the palette was derived from. */
    seed: number;
    /** Hex color stops used to paint the mesh (`#RRGGBB`). */
    colors: string[];
    /** Which color-harmony rule produced the hues. */
    harmony: Harmony;
}
/**
 * Stable string -> 32-bit unsigned hash (FNV-1a + bit-mixing avalanche).
 * Uses the full uint32 range as a seed so similar strings diverge fully.
 */
declare function seedFromString(input: string): number;
/**
 * Normalize a seed to the number the palette math runs on.
 *
 * A finite number is already a seed. Everything else is hashed from its text,
 * including the values TypeScript says cannot arrive here: `undefined` from an
 * unloaded record, `NaN` from a failed parse. Those are real -- an avatar in a
 * list is rendered before its data always is -- and left alone they either
 * throw or poison the arithmetic into colours like `#DF20NAN`, which
 * react-native-svg then fails to parse. Hashing the text keeps them
 * deterministic, distinct from each other, and always renderable.
 */
declare function toSeed(seed: number | string): number;
/** Derive the deterministic color palette for a seed. */
declare function generatePalette(seed: number | string): GradientPalette;

interface MeshSpot {
    x: number;
    y: number;
    radius: number;
    /** Hex `#RRGGBB`, also at `palette[colorIndex]` on the scene. */
    color: string;
    /** Index into {@link MeshScene.palette}. */
    colorIndex: number;
}
interface MeshHighlight {
    x: number;
    y: number;
    radius: number;
}
interface MeshScene {
    /** The numeric seed this scene was built from. */
    seed: number;
    /**
     * The distinct colours the spots draw from, already trimmed to the level of
     * detail. Two to four of them, however many spots there are.
     *
     * Spots reference this by index rather than each carrying its own colour,
     * because every spot shares one normalised alpha ramp and differs only in
     * position, size, and colour. A renderer can therefore define one gradient
     * per colour instead of one per spot -- which, in SVG, is the difference
     * between a dozen gradient nodes and three.
     */
    palette: string[];
    /** Opaque base fill, the palette's first colour. */
    background: string;
    /** Largest first, already trimmed to the level of detail. */
    spots: MeshSpot[];
    /** The soft white sheen laid over everything. */
    highlight: MeshHighlight;
}
/** {@link computeMeshScene}, memoised. See it for what the arguments mean. */
declare function buildMeshScene(seed: number | string, displaySize: number): MeshScene;

export { GradientAvatar, type GradientAvatarProps, type GradientPalette, type Harmony, type MeshHighlight, type MeshScene, type MeshSpot, buildMeshScene, generatePalette, seedFromString, toSeed };
