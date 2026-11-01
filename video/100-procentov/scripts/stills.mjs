// Look checks: bundle once, render chosen frames as JPEG stills. node scripts/stills.mjs 30,120,400 [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";
const frames = (process.argv[2] ?? "0").split(",").map(Number);
const scale = Number(process.argv[3] ?? "0.5");
const B = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
mkdirSync("out/stills", { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable: B, chromiumOptions: { gl: "swangle" } });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "HundredShort", puppeteerInstance: browser });
for (const frame of frames) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame, output: `out/stills/f${String(frame).padStart(4, "0")}.jpg`, scale, imageFormat: "jpeg", jpegQuality: 85, puppeteerInstance: browser, chromiumOptions: { gl: "swangle" }, onBrowserLog: (l) => { if (!/Clock/.test(l.text)) console.log("LOG", l.type, l.text.slice(0, 400)); } });
  console.log(frame, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
await browser.close({ silent: true });
