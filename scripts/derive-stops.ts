/**
 * Derives the gradient stop ramps baked into `src/scene.ts`.
 *
 * The web original paints each spot with four piecewise-linear alpha stops and
 * then runs a CSS `blur()` over the finished frame. React Native has no such
 * filter, and `react-native-svg`'s `<FeGaussianBlur>` renders differently on
 * iOS than on Android, so we cannot reproduce that step directly.
 *
 * What we can do is bake it in. A CSS `blur(Npx)` is a Gaussian whose standard
 * deviation is N, and the original uses N = 6% of the frame -- which, against
 * spot radii of 30-70% of the frame, is a substantial blur, not a light touch.
 * It does not merely round the corners of the ramp; it spreads each spot well
 * past its nominal radius and pulls its peak down. So we convolve the original
 * profile with that same Gaussian here, offline, and ship the result as stops.
 *
 * The convolution is done on a 2D grid rather than along the radius, because a
 * 2D Gaussian applied to a radial profile is not a 1D blur of that profile --
 * every point receives contributions from a full disc around it, and near the
 * centre that is what flattens the peak.
 *
 * Run: node --import tsx scripts/derive-stops.ts
 * The table it prints is asserted against the shipped constants in
 * test/scene.test.ts, so the two cannot silently drift apart.
 */

/** The blur's standard deviation, as a fraction of the frame. */
const BLUR_FRACTION = 0.06;

/**
 * Spot radii run 30-70% of the frame, so the blur is relatively wider on the
 * small spots than the large ones. One ramp has to serve all of them, so it is
 * built for the mean radius; across that range the difference is far smaller
 * than the softness itself.
 */
const MEAN_SPOT_RADIUS = 0.5;
/** The highlight's radius is fixed at 30% of the frame. */
const HIGHLIGHT_RADIUS = 0.3;

/** How far past the nominal radius to carry the ramp. */
const TAIL_SIGMAS = 3;

/**
 * Convolve a radial profile with a 2D Gaussian and return the blurred profile.
 *
 * Both are expressed in units of the shape's own radius: `sigma` is the blur's
 * standard deviation over that radius, and the result is sampled out to
 * `extent` radii. Works on a Cartesian grid and reads the answer back along one
 * ray, which is exact for a radially symmetric input.
 */
function blurRadialProfile(
	profile: (r: number) => number,
	sigma: number,
	extent: number,
	samples: number,
): (u: number) => number {
	// Grid covers the shape plus its blurred tail, with room for the kernel.
	const half = extent + TAIL_SIGMAS * sigma;
	const step = (2 * half) / (samples - 1);
	const at = (i: number) => -half + i * step;

	const source: Float64Array[] = [];
	for (let y = 0; y < samples; y++) {
		const row = new Float64Array(samples);
		const py = at(y);
		for (let x = 0; x < samples; x++) {
			row[x] = profile(Math.hypot(at(x), py));
		}
		source.push(row);
	}

	// Separable Gaussian: blur along x, then along y.
	const radius = Math.max(1, Math.ceil((TAIL_SIGMAS * sigma) / step));
	const kernel = new Float64Array(radius * 2 + 1);
	let total = 0;
	for (let k = -radius; k <= radius; k++) {
		const d = (k * step) / sigma;
		const w = Math.exp(-0.5 * d * d);
		kernel[k + radius] = w;
		total += w;
	}
	for (let k = 0; k < kernel.length; k++) kernel[k] /= total;

	const blurX = (input: Float64Array[]) => {
		const out: Float64Array[] = [];
		for (let y = 0; y < samples; y++) {
			const row = new Float64Array(samples);
			for (let x = 0; x < samples; x++) {
				let sum = 0;
				for (let k = -radius; k <= radius; k++) {
					// Clamp at the edge; the profile is already 0 out there.
					const c = Math.min(samples - 1, Math.max(0, x + k));
					sum += kernel[k + radius] * input[y][c];
				}
				row[x] = sum;
			}
			out.push(row);
		}
		return out;
	};

	const blurY = (input: Float64Array[]) => {
		const out: Float64Array[] = [];
		for (let y = 0; y < samples; y++) {
			const row = new Float64Array(samples);
			for (let x = 0; x < samples; x++) {
				let sum = 0;
				for (let k = -radius; k <= radius; k++) {
					const c = Math.min(samples - 1, Math.max(0, y + k));
					sum += kernel[k + radius] * input[c][x];
				}
				row[x] = sum;
			}
			out.push(row);
		}
		return out;
	};

	const blurred = blurY(blurX(source));

	// Read back along the +x ray from the centre, interpolating between cells.
	// One ray is enough: the input is radially symmetric, so the blurred result
	// is too.
	const centre = (samples - 1) / 2;
	const row = blurred[Math.round(centre)];
	return (u: number) => {
		const pos = centre + u / step;
		const i = Math.floor(pos);
		if (i < 0) return row[0];
		if (i >= samples - 1) return 0;
		const f = pos - i;
		return row[i] * (1 - f) + row[i + 1] * f;
	};
}

const round = (n: number) => Number(n.toFixed(4));

/**
 * Sample a blurred profile into SVG stops.
 *
 * Offsets are relative to the *extended* radius the renderer must draw, since
 * the blur carries colour past the original edge. The final stop is pinned to
 * zero so the fill still vanishes exactly on that boundary and leaves no seam.
 */
function toStops(
	blurred: (u: number) => number,
	extent: number,
	count: number,
): Array<[number, number]> {
	const peak = blurred(0);
	const stops: Array<[number, number]> = [];
	for (let i = 0; i < count; i++) {
		const offset = i / (count - 1);
		const alpha = i === count - 1 ? 0 : blurred(offset * extent);
		stops.push([round(offset), round(Math.max(0, Math.min(peak, alpha)))]);
	}
	return stops;
}

/* -- spot ramp -- */

/** The web original's four stops: 0xFF / 0xDD / 0x88 / 0x00 at 0, .3, .6, 1. */
const SPOT_CONTROL_OFFSETS = [0, 0.3, 0.6, 1];
const SPOT_CONTROL_ALPHAS = [1, 221 / 255, 136 / 255, 0];

function spotProfile(r: number): number {
	if (r >= 1) return 0;
	let i = 0;
	while (i < SPOT_CONTROL_OFFSETS.length - 2 && r > SPOT_CONTROL_OFFSETS[i + 1])
		i++;
	const t =
		(r - SPOT_CONTROL_OFFSETS[i]) /
		(SPOT_CONTROL_OFFSETS[i + 1] - SPOT_CONTROL_OFFSETS[i]);
	return (
		SPOT_CONTROL_ALPHAS[i] +
		t * (SPOT_CONTROL_ALPHAS[i + 1] - SPOT_CONTROL_ALPHAS[i])
	);
}

/** Blur sigma over the spot's own radius. */
const SPOT_SIGMA = BLUR_FRACTION / MEAN_SPOT_RADIUS;
/** How far past its radius a spot must be drawn to hold the blurred tail. */
export const SPOT_EXTENT = round(1 + TAIL_SIGMAS * SPOT_SIGMA);

export function deriveSpotStops(): Array<[number, number]> {
	const blurred = blurRadialProfile(spotProfile, SPOT_SIGMA, 1, 401);
	return toStops(blurred, SPOT_EXTENT, 12);
}

/* -- highlight ramp -- */

/** The web original's white sheen: 15% alpha at the centre, 0 at the edge. */
const HIGHLIGHT_PEAK_ALPHA = 0.15;

const HIGHLIGHT_SIGMA = BLUR_FRACTION / HIGHLIGHT_RADIUS;
export const HIGHLIGHT_EXTENT = round(1 + TAIL_SIGMAS * HIGHLIGHT_SIGMA);

export function deriveHighlightStops(): Array<[number, number]> {
	const blurred = blurRadialProfile(
		(r) => (r >= 1 ? 0 : HIGHLIGHT_PEAK_ALPHA * (1 - r)),
		HIGHLIGHT_SIGMA,
		1,
		401,
	);
	return toStops(blurred, HIGHLIGHT_EXTENT, 8);
}

if (process.argv[1]?.endsWith("derive-stops.ts")) {
	const fmt = (stops: Array<[number, number]>) =>
		stops.map(([o, a]) => `\t[${o}, ${a}],`).join("\n");
	console.log(`SPOT_EXTENT = ${SPOT_EXTENT};`);
	console.log(`SPOT_STOPS = [\n${fmt(deriveSpotStops())}\n];`);
	console.log(`HIGHLIGHT_EXTENT = ${HIGHLIGHT_EXTENT};`);
	console.log(`HIGHLIGHT_STOPS = [\n${fmt(deriveHighlightStops())}\n];`);
}
