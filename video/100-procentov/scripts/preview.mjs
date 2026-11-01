// Раскадровка-превью: по одному кадру из середины каждой сцены -> out/preview/scene-01.jpg ...
// Запуск: npm run preview            — все сцены
//         npm run preview -- 3 7 8   — только сцены 3, 7 и 8
//         npm run preview -- --at 0.8 — кадр на 80% длины сцены
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { at: { type: "string", default: "0.5" } } });
const project = JSON.parse(readFileSync("data/project.json", "utf8"));
const only = positionals.map(Number).filter(Boolean);
const at = Number(values.at);

const t0 = Date.now();
console.log("Собираю проект...");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Stickman", chromiumOptions: { gl: "angle" }, logLevel: "error" });
mkdirSync("out/preview", { recursive: true });

for (const [i, s] of project.scenes.entries()) {
  const n = i + 1;
  if (only.length && !only.includes(n)) continue;
  const frame = Math.min(composition.durationInFrames - 1, Math.round((s.start + (s.end - s.start) * at) * project.fps));
  const output = `out/preview/scene-${String(n).padStart(2, "0")}.jpg`;
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5, chromiumOptions: { gl: "angle" }, logLevel: "error" });
  console.log(`${output}  (${s.start.toFixed(1)}–${s.end.toFixed(1)} c) ${s.note ?? ""}`);
}
console.log(`Готово за ${((Date.now() - t0) / 1000).toFixed(0)} c`);
