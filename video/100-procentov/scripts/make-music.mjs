// Фоновая музыка без авторских прав, сгенерированная кодом.
// Один трек на весь ролик:  npm run music -- --mood calm   (calm | tense | upbeat | mystery)
//   длина = data/project.json duration + 2 c, можно задать --seconds 120
// Треки под главы:          npm run music -- --all
//   public/music/calm.wav, tense.wav, upbeat.wav, mystery.wav по 2 минуты — для audio.musicParts
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { TAU, fade, makeNoise, normalize, svf, writeWav } from "./dsp.mjs";

const { values } = parseArgs({
  options: {
    mood: { type: "string", default: "calm" },
    seconds: { type: "string" },
    out: { type: "string", default: "public/music/bed.wav" },
    all: { type: "boolean", default: false },
  },
});

if (values.all) {
  for (const m of ["calm", "tense", "upbeat", "mystery"]) {
    spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--mood", m, "--seconds", values.seconds ?? "125", "--out", `public/music/${m}.wav`], {
      stdio: "inherit",
    });
  }
  process.exit(0);
}

let seconds = Number(values.seconds);
if (!seconds) {
  try {
    seconds = JSON.parse(readFileSync("data/project.json", "utf8")).duration + 2;
  } catch {
    seconds = 60;
  }
}

const FS = 32000;
const MOODS = {
  calm: { bpm: 78, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], arp: true, drums: false, cutoff: 1500 },
  tense: { bpm: 92, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], arp: true, drums: false, cutoff: 1100, pulse: true },
  upbeat: { bpm: 104, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], arp: true, drums: true, cutoff: 2200 },
  mystery: { bpm: 70, chords: [[57, 60, 64, 71], [57, 60, 64, 69], [53, 57, 60, 67], [52, 56, 59, 64]], arp: false, drums: false, cutoff: 900 },
};
const mood = MOODS[values.mood] ?? MOODS.calm;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const n = Math.floor(seconds * FS);
const out = new Float32Array(n);
const beat = 60 / mood.bpm;
const chordLen = beat * 8;
const noise = makeNoise(5);

// Пэд: по 2 расстроенные пилы на ноту, мягкий фильтр, плавная смена аккордов
const padFilter = svf(FS);
const phases = new Float64Array(16);
for (let i = 0; i < n; i++) {
  const t = i / FS;
  const ci = Math.floor(t / chordLen);
  const ct = t - ci * chordLen;
  const chord = mood.chords[ci % mood.chords.length];
  const prev = mood.chords[(ci + mood.chords.length - 1) % mood.chords.length];
  const xf = Math.min(1, ct / 1.2);
  let s = 0;
  const voice = (notes, gain, off) => {
    notes.forEach((note, k) => {
      for (let d = 0; d < 2; d++) {
        const idx = off + k * 2 + d;
        phases[idx] += (midi(note) * (d ? 1.0035 : 0.9965)) / FS;
        s += (2 * (phases[idx] - Math.floor(phases[idx])) - 1) * gain;
      }
    });
  };
  voice(chord, xf * 0.12, 0);
  if (xf < 1) voice(prev, (1 - xf) * 0.12, 8);
  const lfo = 0.85 + 0.15 * Math.sin(TAU * 0.07 * t);
  out[i] += padFilter(s, mood.cutoff * lfo, 0.6).low;

  // бас на сильные доли
  const bt = t % (beat * 2);
  const root = midi(chord[0] - 12);
  out[i] += Math.sin(TAU * root * t) * Math.exp(-bt * 1.6) * 0.32 * Math.min(1, bt / 0.02);

  if (mood.pulse) {
    const pt = t % (beat / 2);
    out[i] += Math.sin(TAU * midi(chord[0]) * t) * Math.exp(-pt * 9) * 0.06;
  }
}

// Арпеджио с эхом
if (mood.arp) {
  const step = beat / 2;
  const arpBuf = new Float32Array(n);
  for (let k = 0; k * step < seconds; k++) {
    const t0 = k * step;
    const ci = Math.floor(t0 / chordLen);
    const chord = mood.chords[ci % mood.chords.length];
    const note = chord[[0, 1, 2, 1][k % 4] % chord.length] + 12;
    const f = midi(note);
    const start = Math.floor(t0 * FS);
    const len = Math.floor(0.6 * FS);
    for (let j = 0; j < len && start + j < n; j++) {
      const tt = j / FS;
      const tri = (2 / Math.PI) * Math.asin(Math.sin(TAU * f * tt));
      arpBuf[start + j] += tri * Math.exp(-tt * 7) * 0.07;
    }
  }
  const delay = Math.floor(beat * 0.75 * FS);
  for (let i = delay; i < n; i++) arpBuf[i] += arpBuf[i - delay] * 0.32;
  for (let i = 0; i < n; i++) out[i] += arpBuf[i];
}

// Барабаны для бодрого настроения
if (mood.drums) {
  const hat = svf(FS);
  for (let i = 0; i < n; i++) {
    const t = i / FS;
    const b = t % beat;
    const bi = Math.floor(t / beat) % 4;
    if (bi === 0 || bi === 2) out[i] += Math.sin(TAU * (45 + 90 * Math.exp(-b * 30)) * b) * Math.exp(-b * 9) * 0.5;
    if (bi === 1 || bi === 3) out[i] += noise() * Math.exp(-b * 22) * 0.16;
    const h = t % (beat / 2);
    out[i] += hat(noise(), 6000, 0.7).high * Math.exp(-h * 60) * 0.06;
  }
}

fade(out, FS, 2, 3);
normalize(out, 0.89);
writeWav(path.resolve(values.out), out, FS);
console.log(`Готово: ${values.mood}, ${seconds.toFixed(1)} c -> ${values.out}`);
