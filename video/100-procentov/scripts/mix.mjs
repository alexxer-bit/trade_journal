// Sound for «100%»: padded voice + music bed (ducked under the voice) + SFX cues from story.ts, then mux onto the
// silent render. node scripts/mix.mjs [video] [out]. Without public/hundred/voice.wav it mixes music + SFX only.
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
const video = process.argv[2] ?? "out/video.mp4", out = process.argv[3] ?? "out/final.mp4";
const src = readFileSync("src/videos/hundred/story.ts", "utf8");
const T = Object.fromEntries([...src.matchAll(/(\w+): ([\d.]+)/g)].filter(([, k]) => !/^\d/.test(k)).map(([, k, v]) => [k, Number(v)]));
const block = src.slice(src.indexOf("export const SFX"));
const cues = [...block.matchAll(/\[([^,\[\]\s]+), "(\w+)", (-?[\d.]+)\]/g)].map(([, t, n, db]) => [t.startsWith("T.") ? T[t.slice(2)] : Number(t), n, Number(db)]);
const DUR = Number(src.match(/DURATION = ([\d.]+)/)[1]);
const voice = existsSync("public/hundred/voice.wav");
const inputs = ["-i", video, "-i", "public/music/bed.wav"];
if (voice) inputs.push("-i", "public/hundred/voice.wav");
const base = voice ? 3 : 2;
cues.forEach(([, n]) => inputs.push("-i", `public/sfx/${n}.wav`));
const f = [];
cues.forEach(([t, , db], i) => f.push(`[${base + i}:a]aresample=48000,volume=${db - 17}dB,adelay=${Math.round(t * 1000)}:all=1[s${i}]`));
f.push(`${cues.map((_, i) => `[s${i}]`).join("")}amix=inputs=${cues.length}:normalize=0[sfx]`);
f.push(`[1:a]aresample=48000,atrim=0:${DUR},afade=t=in:d=0.4,afade=t=out:st=${DUR - 2.2}:d=2.2,volume=-22dB[mus]`);
if (voice) {
  f.push(`[2:a]aresample=48000,asplit=2[v][vk]`);
  f.push(`[mus][vk]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=400[duck]`);
  f.push(`[v][duck][sfx]amix=inputs=3:normalize=0,volume=2dB,alimiter=limit=0.89:level=false[a]`);
} else f.push(`[mus][sfx]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5[a]`);
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", f.join(";"), "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(DUR), out], { stdio: "inherit" });
console.log(voice ? "with voice" : "NO VOICE (music + sfx only)", cues.length, "cues ->", out, "exit", r.status);
