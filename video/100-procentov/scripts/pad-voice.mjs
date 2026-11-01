// Insert pauses after given words (by index) so the picture has room to breathe; writes padded word timings
// and the ffmpeg command that builds the padded voice from the raw one.
import fs from "node:fs";
const W = JSON.parse(fs.readFileSync("data/words_raw.json", "utf8"));
const RAW_END = 32.58;
// word index -> seconds of silence inserted after it
const GAP = { 8: 0.9, 10: 0.3, 13: 0.3, 16: 1.8, 20: 0.6, 22: 0.6, 24: 0.8, 29: 2.2, 38: 1.0, 40: 1.0, 42: 3.0, 48: 1.6, 56: 0.6, 58: 3.0, 66: 2.2, 75: 3.5 };
const TAIL = 2.6;
const cuts = []; let shift = 0; const out = [];
W.forEach(([w, a, b], i) => {
  out.push({ w, a: +(a + shift).toFixed(2), b: +(b + shift).toFixed(2) });
  if (GAP[i]) { const nextA = i + 1 < W.length ? W[i + 1][1] : RAW_END; const cut = +(Math.min(b + 0.06, (b + nextA) / 2)).toFixed(3); cuts.push([cut, GAP[i]]); shift += GAP[i]; }
});
const total = +(RAW_END + shift + TAIL).toFixed(2);
fs.writeFileSync("data/words.json", JSON.stringify({ total, words: out }, null, 0));
// ffmpeg: split raw voice at cuts, add silence after each piece
let prev = 0; const parts = [];
for (const [c, g] of cuts) { parts.push([prev, c, g]); prev = c; }
parts.push([prev, RAW_END, TAIL]);
const f = parts.map(([a, b, g], i) => `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,apad=pad_dur=${g}[p${i}]`).join(";");
const cmd = `ffmpeg -y -i input/voice.wav -filter_complex "${f};${parts.map((_, i) => `[p${i}]`).join("")}concat=n=${parts.length}:v=0:a=1,aresample=48000[o]" -map "[o]" -ac 1 public/hundred/voice.wav`;
fs.writeFileSync("scripts/pad-voice.sh", cmd + "\n");
console.log("total", total);
for (const x of out) process.stdout.write(`${x.w}@${x.a} `);
console.log();
