// Рендер видео. npm run test-render — первые 30 секунд, npm run render — весь ролик.
// Дополнительно: --seconds 20 (длина теста), --from 60 (начать тест с 60-й секунды), --concurrency 4
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    test: { type: "boolean", default: false },
    seconds: { type: "string", default: "30" },
    from: { type: "string", default: "0" },
    concurrency: { type: "string" },
    out: { type: "string" },
  },
});

const project = JSON.parse(readFileSync("data/project.json", "utf8"));
const fps = project.fps;
const total = Math.ceil(project.duration * fps);
const args = [path.join("node_modules", "@remotion", "cli", "remotion-cli.js"), "render", "Stickman"];
let out = values.out;
if (values.test) {
  const a = Math.max(0, Math.round(Number(values.from) * fps));
  const b = Math.min(total - 1, a + Math.round(Number(values.seconds) * fps) - 1);
  args.push(`--frames=${a}-${b}`);
  out = out ?? "out/test.mp4";
} else {
  out = out ?? "out/final.mp4";
}
args.push(out, "--gl=angle", "--codec=h264", "--crf=18");
if (values.concurrency) args.push(`--concurrency=${values.concurrency}`);

mkdirSync("out", { recursive: true });
const t0 = Date.now();
console.log(`Рендер ${values.test ? "теста" : "ролика"} -> ${out}`);
// Чистый вывод: без технических предупреждений браузера, прогресс каждые 10%
const child = spawn(process.execPath, args, { stdio: ["inherit", "pipe", "pipe"] });
let lastPct = -10;
const onData = (buf) => {
  for (const line of buf.toString().split(/\r?\n|\r/)) {
    if (!line.trim() || /THREE\.Clock|er instead\.|^\[Tab \d+/.test(line)) continue;
    const m = line.match(/Rendered (\d+)\/(\d+)/);
    if (m) {
      const pct = Math.floor((Number(m[1]) / Number(m[2])) * 100);
      if (pct >= lastPct + 10 || m[1] === m[2]) {
        lastPct = pct;
        console.log(`  ${pct}%  (${m[1]}/${m[2]} кадров)`);
      }
      continue;
    }
    if (/^Bundling \d+%/.test(line)) continue;
    console.log(line);
  }
};
child.stdout.on("data", onData);
child.stderr.on("data", onData);
child.on("exit", (code) => {
  const sec = (Date.now() - t0) / 1000;
  if (code === 0) {
    const mb = (statSync(out).size / 1024 / 1024).toFixed(1);
    console.log(`\nГотово за ${Math.floor(sec / 60)} мин ${Math.round(sec % 60)} с -> ${out} (${mb} МБ)`);
  } else {
    console.log(`\nРендер упал с кодом ${code} через ${sec.toFixed(0)} с`);
  }
  process.exit(code ?? 1);
});
