// Мини-синтезатор: шум, фильтры, огибающие и запись WAV. Без внешних зависимостей.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export const TAU = Math.PI * 2;

// Детерминированный шум, чтобы звуки получались одинаковыми при каждой генерации
export const makeNoise = (seed = 1) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
};

// Фильтр с переменной частотой среза (state variable filter)
export const svf = (fs) => {
  let low = 0;
  let band = 0;
  return (x, fc, q = 0.7) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, fs / 6.5)) / fs);
    const damp = 1 / Math.max(0.5, q);
    const high = x - low - damp * band;
    band += f * high;
    low += f * band;
    return { low, band, high };
  };
};

export const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) * d));

export const normalize = (buf, peak = 0.9) => {
  let m = 0;
  for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
  if (m > 0) for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] / m) * peak;
  return buf;
};

export const fade = (buf, fs, inSec, outSec) => {
  const ni = Math.floor(inSec * fs);
  const no = Math.floor(outSec * fs);
  for (let i = 0; i < ni && i < buf.length; i++) buf[i] *= i / ni;
  for (let i = 0; i < no && i < buf.length; i++) buf[buf.length - 1 - i] *= i / no;
  return buf;
};

export const writeWav = (file, buf, fs) => {
  mkdirSync(path.dirname(file), { recursive: true });
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(fs, 24);
  h.writeUInt32LE(fs * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
};
