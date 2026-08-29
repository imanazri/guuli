import { memo, useId, useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import {
	buildMeshScene,
	FRAME,
	HIGHLIGHT_EXTENT,
	HIGHLIGHT_STOPS,
	SPOT_EXTENT,
	SPOT_STOPS,
} from "./scene.ts";

export interface GradientAvatarProps {
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
function GradientAvatarInner({
	seed,
	size = 32,
	radius,
	style,
	accessibilityLabel,
	testID,
}: GradientAvatarProps) {
	const scene = useMemo(() => buildMeshScene(seed, size), [seed, size]);

	// Gradients are referenced by id. On react-native-web those become real DOM
	// ids, which are document-global, so two avatars on one screen would
	// otherwise paint each other's colours. `useId` keeps each instance's
	// namespace to itself.
	//
	// Its format is a React implementation detail and has changed between
	// versions (`:r0:` on 18, `_r_0_` on 19). Colons in particular mean
	// namespaces in XML and break a `url(#...)` reference, so keep only
	// characters that are safe in an id and lead with a letter.
	const uid = `g${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;

	const borderRadius = radius ?? size / 2;

	return (
		<View
			testID={testID}
			accessible={accessibilityLabel !== undefined}
			accessibilityLabel={accessibilityLabel}
			accessibilityRole={accessibilityLabel !== undefined ? "image" : undefined}
			importantForAccessibility={
				accessibilityLabel === undefined ? "no-hide-descendants" : undefined
			}
			style={[
				{ width: size, height: size, borderRadius, overflow: "hidden" },
				style,
			]}
		>
			<Svg width={size} height={size} viewBox={`0 0 ${FRAME} ${FRAME}`}>
				<Defs>
					{/*
					 * One gradient per palette colour, not per spot. Every spot shares
					 * the same normalised ramp and differs only in where it sits and
					 * how big it is, so with the default `objectBoundingBox` units a
					 * single definition maps itself onto each circle it fills. Since a
					 * palette is two to four colours and a mesh is up to nine spots,
					 * this is roughly half the nodes — and in react-native-svg every
					 * <Stop> is a real view, so nodes are what a screenful costs.
					 */}
					{scene.palette.map((color, i) => (
						<RadialGradient key={color} id={`${uid}c${i}`}>
							{SPOT_STOPS.map(([offset, opacity]) => (
								<Stop
									key={offset}
									offset={offset}
									stopColor={color}
									stopOpacity={opacity}
								/>
							))}
						</RadialGradient>
					))}
					<RadialGradient id={`${uid}h`}>
						{HIGHLIGHT_STOPS.map(([offset, opacity]) => (
							<Stop
								key={offset}
								offset={offset}
								stopColor="#FFFFFF"
								stopOpacity={opacity}
							/>
						))}
					</RadialGradient>
				</Defs>

				<Rect x={0} y={0} width={FRAME} height={FRAME} fill={scene.background} />

				{/*
				 * Each spot's alpha reaches exactly 0 at the end of its ramp, so a
				 * circle drawn to that point covers everything the gradient can
				 * paint. Filling the whole frame per spot would be the same output with
				 * far more overdraw, which is what a list of avatars feels.
				 */}
				{scene.spots.map((spot, i) => (
					<Circle
						// biome-ignore lint/suspicious/noArrayIndexKey: stable by construction
						key={i}
						cx={spot.x}
						cy={spot.y}
						r={spot.radius * SPOT_EXTENT}
						fill={`url(#${uid}c${spot.colorIndex})`}
					/>
				))}

				<Circle
					cx={scene.highlight.x}
					cy={scene.highlight.y}
					r={scene.highlight.radius * HIGHLIGHT_EXTENT}
					fill={`url(#${uid}h)`}
				/>
			</Svg>
		</View>
	);
}

export const GradientAvatar = memo(GradientAvatarInner);
GradientAvatar.displayName = "GradientAvatar";
