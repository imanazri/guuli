/**
 * Emits the exact SVG markup `<GradientAvatar>` renders, as a standalone
 * string. Used by the visual comparison harness (scripts/compare.ts) so the
 * thing being compared is the real output, not a re-implementation of it.
 */
import {
	buildMeshScene,
	FRAME,
	HIGHLIGHT_EXTENT,
	HIGHLIGHT_STOPS,
	SPOT_EXTENT,
	SPOT_STOPS,
} from "../src/scene.ts";

export function renderAvatarSvg(
	seed: string | number,
	size: number,
	uid = "a",
): string {
	const scene = buildMeshScene(seed, size);

	const stops = (
		table: ReadonlyArray<readonly [number, number]>,
		color: string,
	) =>
		table
			.map(
				([offset, opacity]) =>
					`<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`,
			)
			.join("");

	const defs = [
		...scene.spots.map(
			(spot, i) =>
				`<radialGradient id="${uid}s${i}" gradientUnits="userSpaceOnUse" cx="${spot.x}" cy="${spot.y}" r="${spot.radius * SPOT_EXTENT}">${stops(SPOT_STOPS, spot.color)}</radialGradient>`,
		),
		`<radialGradient id="${uid}h" gradientUnits="userSpaceOnUse" cx="${scene.highlight.x}" cy="${scene.highlight.y}" r="${scene.highlight.radius * HIGHLIGHT_EXTENT}">${stops(HIGHLIGHT_STOPS, "#FFFFFF")}</radialGradient>`,
	].join("");

	const body = [
		`<rect x="0" y="0" width="${FRAME}" height="${FRAME}" fill="${scene.background}"/>`,
		...scene.spots.map(
			(spot, i) =>
				`<circle cx="${spot.x}" cy="${spot.y}" r="${spot.radius * SPOT_EXTENT}" fill="url(#${uid}s${i})"/>`,
		),
		`<circle cx="${scene.highlight.x}" cy="${scene.highlight.y}" r="${scene.highlight.radius * HIGHLIGHT_EXTENT}" fill="url(#${uid}h)"/>`,
	].join("");

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${FRAME} ${FRAME}"><defs>${defs}</defs>${body}</svg>`;
}
