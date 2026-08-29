/**
 * Builds a page that puts this package's SVG output next to the real
 * `@outpacelabs/avatars` web component, seed for seed, so the two can be
 * compared by eye.
 *
 * The reference side reproduces that package's own React component rather than
 * its export helpers: a 256px canvas painted with `drawMeshGradient`, scaled
 * into the box and blurred with CSS at 6% of the display size. That -- not the
 * `renderGradient` export path, which additionally zooms 1.24x -- is what a web
 * user actually sees.
 *
 * Run: node --import tsx scripts/compare.ts > /tmp/avcmp/index.html
 */
import { renderAvatarSvg } from "./render-svg.ts";

// Strings only: the harness round-trips seeds through DOM attributes, and a
// number seed would come back as a string and paint a different avatar.
const SEEDS = [
	"jane@example.com",
	"acme",
	"outpace",
	"studio",
	"user-1",
	"user-2",
	"user-3",
	"42",
];
const SIZES = [24, 40, 96, 160];

const rows = SIZES.map((size) => {
	const ours = SEEDS.map(
		(seed, i) =>
			`<div class="cell">${renderAvatarSvg(seed, size, `u${size}_${i}_`)}</div>`,
	).join("");
	const theirs = SEEDS.map(
		(seed) =>
			`<div class="cell"><span class="ref" data-seed="${String(seed)}" data-size="${size}"></span></div>`,
	).join("");
	return `
    <section>
      <h2>${size}px</h2>
      <div class="row"><span class="tag">ours</span>${ours}</div>
      <div class="row"><span class="tag">web</span>${theirs}</div>
    </section>`;
}).join("");

console.log(`<!doctype html>
<html><head><meta charset="utf-8"><title>parity</title>
<style>
  body { font: 13px -apple-system, sans-serif; background:#fff; color:#111; margin:24px; }
  section { margin-bottom: 28px; }
  h2 { font-size: 12px; color:#888; font-weight:600; margin:0 0 8px; }
  .row { display:flex; align-items:center; gap:14px; margin-bottom:8px; }
  .tag { width:34px; font-size:10px; color:#aaa; text-transform:uppercase; }
  .cell { display:flex; align-items:center; justify-content:center; }
  .cell svg, .ref { border-radius: 9999px; overflow: hidden; display:block; }
  .ref { display:inline-block; }
  .ref canvas { width:100%; height:100%; display:block; }
</style></head>
<body>
${rows}
<script type="module">
  import { drawMeshGradient } from './avatars.js';
  const RENDER = 256;
  for (const host of document.querySelectorAll('.ref')) {
    const seed = host.dataset.seed;
    const size = Number(host.dataset.size);
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    const canvas = document.createElement('canvas');
    canvas.width = RENDER; canvas.height = RENDER;
    const ctx = canvas.getContext('2d');
    drawMeshGradient(ctx, seed, RENDER, { displaySize: size });
    canvas.style.filter = 'blur(' + Math.max(1, Math.round(size * 0.06)) + 'px)';
    host.appendChild(canvas);
  }
  document.title = 'ready';
</script>
</body></html>`);
