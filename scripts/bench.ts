import {
  buildMeshScene,
  clearSceneCache,
  HIGHLIGHT_STOPS,
  SPOT_STOPS,
} from "../src/scene.ts";
import { generatePalette } from "../src/engine.ts";

const bench = (name: string, iterations: number, fn: (i: number) => void) => {
  fn(0); // warm the JIT
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn(i);
  const ns = Number(process.hrtime.bigint() - t0);
  const per = ns / iterations;
  console.log(`${name.padEnd(46)} ${(per / 1000).toFixed(2).padStart(8)} µs/op`);
  return per / 1e6; // ms
};

console.log("--- cold (cache miss every time) ---");
const coldSmall = bench("buildMeshScene(seed, 40)  cold", 20000, (i) => {
  clearSceneCache();
  buildMeshScene(`user-${i}`, 40);
});
const coldLarge = bench("buildMeshScene(seed, 160) cold", 20000, (i) => {
  clearSceneCache();
  buildMeshScene(`user-${i}`, 160);
});
bench("generatePalette(seed)         alone", 50000, (i) => {
  generatePalette(`user-${i}`);
});

console.log("\n--- warm (the path a re-render actually takes) ---");
clearSceneCache();
for (let i = 0; i < 200; i++) buildMeshScene(`user-${i}`, 40);
const warm = bench("buildMeshScene(seed, 40)  cached", 200000, (i) => {
  buildMeshScene(`user-${i % 200}`, 40);
});

console.log("\n--- what a screen costs ---");
clearSceneCache();
const screen = bench("12 avatars @40, all cache misses", 5000, (i) => {
  for (let n = 0; n < 12; n++) buildMeshScene(`row-${i}-${n}`, 40);
});
console.log(`\n  a 12-avatar screen, worst case: ${(screen).toFixed(3)} ms`);
console.log(`  as a share of a 16.67 ms frame: ${((screen / 16.67) * 100).toFixed(1)}%`);
console.log(`  cached re-render of the same:   ${(warm * 12).toFixed(4)} ms`);

console.log("\n--- SVG nodes per avatar (what the cost actually is) ---");
console.log("  in react-native-svg every <Stop> is a real view, so stops dominate");
console.log(`  ${"size".padStart(4)} ${"spots".padStart(5)} ${"colours".padStart(7)} ${"gradients".padStart(9)} ${"stops".padStart(5)} ${"vs per-spot".padStart(11)}`);
for (const size of [16, 24, 32, 40, 64, 96, 160]) {
  clearSceneCache();
  const s = buildMeshScene("outpace", size);
  const spots = s.spots.length;
  const colours = s.palette.length;
  const gradients = colours + 1;
  const stops = colours * SPOT_STOPS.length + HIGHLIGHT_STOPS.length;
  const naive = spots * SPOT_STOPS.length + HIGHLIGHT_STOPS.length;
  console.log(
    `  ${String(size).padStart(4)} ${String(spots).padStart(5)} ${String(colours).padStart(7)}` +
    ` ${String(gradients).padStart(9)} ${String(stops).padStart(5)}` +
    ` ${`${naive} (-${Math.round((1 - stops / naive) * 100)}%)`.padStart(11)}`,
  );
}
