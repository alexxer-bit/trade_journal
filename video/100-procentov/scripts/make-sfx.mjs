// Генерирует библиотеку звуковых эффектов в public/sfx/*.wav. Запуск: npm run sfx
import path from "node:path";
import { TAU, env, makeNoise, normalize, svf, writeWav } from "./dsp.mjs";

const FS = 44100;
const OUT = path.resolve("public", "sfx");

const render = (seconds, fn, seed = 1) => {
  const n = Math.floor(seconds * FS);
  const buf = new Float32Array(n);
  const noise = makeNoise(seed);
  const st = { noise, f1: svf(FS), f2: svf(FS), f3: svf(FS), ph: 0, ph2: 0, ph3: 0 };
  for (let i = 0; i < n; i++) buf[i] = fn(i / FS, st, seconds);
  return normalize(buf, 0.9);
};

const sine = (st, key, freq) => {
  st[key] += (TAU * freq) / FS;
  return Math.sin(st[key]);
};

const SOUNDS = {
  whoosh: [
    0.7,
    (t, st, L) => {
      const u = t / L;
      const fc = 250 + 3200 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 2;
      const a = Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 1.5;
      return st.f1(st.noise(), fc, 1.6).band * a;
    },
  ],
  swoosh: [
    0.4,
    (t, st, L) => {
      const u = t / L;
      const fc = 900 + 5000 * u;
      const a = Math.sin(Math.PI * u) ** 2;
      return st.f1(st.noise(), fc, 1.2).band * a;
    },
  ],
  rise: [
    1.3,
    (t, st, L) => {
      const u = t / L;
      const fc = 200 + 6000 * u * u;
      const a = u < 0.92 ? u ** 1.6 : (1 - u) / 0.08;
      return (st.f1(st.noise(), fc, 2).band * 0.8 + sine(st, "ph", 180 + 700 * u * u) * 0.25) * a;
    },
  ],
  pop: [
    0.16,
    (t, st) => {
      const f = 300 + 700 * Math.exp(-t * 45);
      return sine(st, "ph", f) * env(t, 0.002, 30) + st.noise() * env(t, 0.0005, 400) * 0.3;
    },
  ],
  click: [
    0.06,
    (t, st) => st.f1(st.noise(), 5000, 0.8).high * env(t, 0.0003, 160) + sine(st, "ph", 2200) * env(t, 0.001, 120) * 0.5,
  ],
  ding: [
    1.4,
    (t, st) => {
      const b = 1320;
      return (
        sine(st, "ph", b) * env(t, 0.002, 3.2) +
        sine(st, "ph2", b * 2.76) * env(t, 0.002, 6) * 0.45 +
        sine(st, "ph3", b * 5.4) * env(t, 0.001, 11) * 0.25
      );
    },
  ],
  thud: [
    0.45,
    (t, st) => sine(st, "ph", 45 + 60 * Math.exp(-t * 18)) * env(t, 0.003, 9) + st.f1(st.noise(), 400, 0.7).low * env(t, 0.001, 25) * 0.8,
  ],
  impact: [
    1.2,
    (t, st) =>
      sine(st, "ph", 32 + 55 * Math.exp(-t * 7)) * env(t, 0.004, 3.5) +
      st.f1(st.noise(), 900 * Math.exp(-t * 3) + 120, 0.8).low * env(t, 0.001, 5) * 0.9 +
      st.f2(st.noise(), 3000, 0.7).high * env(t, 0.0005, 60) * 0.5,
  ],
  tick: [
    0.07,
    (t, st) => sine(st, "ph", 1900) * env(t, 0.0008, 70) + st.f1(st.noise(), 3000, 1).band * env(t, 0.0005, 200) * 0.4,
  ],
  glitch: [
    0.55,
    (t, st) => {
      const seg = Math.floor(t * 28);
      const r = Math.sin(seg * 12.9898) * 43758.5453;
      const k = r - Math.floor(r);
      if (k < 0.18) return 0;
      const f = 120 + 1800 * k;
      const sq = Math.sign(sine(st, "ph", f));
      const crushed = Math.round(st.noise() * 4) / 4;
      return (k > 0.6 ? sq * 0.6 : crushed * 0.7) * (t < 0.5 ? 1 : (0.55 - t) / 0.05);
    },
  ],
  heartbeat: [
    1.0,
    (t, st) => {
      const beat = (t0, amp) => sine(st, "ph", 55 + 30 * Math.exp(-(t - t0) * 30)) * env(t - t0, 0.004, 14) * amp;
      return beat(0, 1) + beat(0.28, 0.75);
    },
  ],
  sparkle: [
    1.0,
    (t, st) => {
      let s = 0;
      for (let k = 0; k < 9; k++) {
        const t0 = k * 0.08;
        const f = 2200 + k * 330 + (k % 3) * 210;
        s += Math.sin(TAU * f * (t - t0)) * env(t - t0, 0.001, 14) * 0.4;
      }
      return s;
    },
  ],
  buzz: [
    0.6,
    (t, st) => {
      const on = (t < 0.22 || (t > 0.3 && t < 0.52)) ? 1 : 0;
      st.ph += (110 / FS);
      const saw = 2 * (st.ph - Math.floor(st.ph)) - 1;
      return st.f1(saw, 1400, 0.8).low * on;
    },
  ],
  boing: [
    0.75,
    (t, st) => sine(st, "ph", 260 + 160 * Math.sin(TAU * 11 * t) * Math.exp(-t * 4) + 80 * t) * env(t, 0.003, 4),
  ],
  scribble: [
    0.7,
    (t, st) => {
      const stroke = Math.max(0, Math.sin(TAU * 7.5 * t + Math.sin(TAU * 3 * t))) ** 2;
      return st.f1(st.noise(), 2500 + 1500 * Math.sin(TAU * 5 * t), 2.5).band * stroke;
    },
  ],
  cash: [
    0.9,
    (t, st) =>
      st.f1(st.noise(), 4000, 1).high * env(t, 0.0005, 80) * 0.6 +
      sine(st, "ph", 2093) * env(t - 0.05, 0.002, 6) * 0.6 * (t > 0.05 ? 1 : 0) +
      sine(st, "ph2", 2637) * env(t - 0.12, 0.002, 5) * 0.6 * (t > 0.12 ? 1 : 0) +
      st.f2(st.noise(), 6000, 3).band * env(t - 0.05, 0.002, 9) * 0.25,
  ],
};

let i = 0;
for (const [name, [len, fn]] of Object.entries(SOUNDS)) {
  writeWav(path.join(OUT, `${name}.wav`), render(len, fn, 11 + i++), FS);
}
console.log(`Готово: ${Object.keys(SOUNDS).length} звуков -> ${OUT}`);
