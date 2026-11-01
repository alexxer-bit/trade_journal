// Расшифровка озвучки с временем каждого слова (Whisper на видеокарте через WebGPU).
// Запуск: npm run transcribe -- input/voice.mp3 --lang ru [--model large-v3-turbo]
// --lang обязателен (ru, en, es, de, …): Whisper не умеет сам определять язык,
// а с неверным языком вместо текста выходит каша или перевод.
// Результат: public/audio/voice.<ext>, data/transcript.json, data/transcript.txt
import { registerMediabunnyServer } from "@mediabunny/server";
import {
  WHISPER_WEBGPU_SAMPLE_RATE,
  canUseWhisperWebGpu,
  downloadWhisperModel,
  loadWhisperModel,
  toCaptions,
  transcribe,
  type WhisperWebGpuModel,
} from "@remotion/whisper-webgpu";
import { ALL_FORMATS, Conversion, FilePathSource, Input, NullTarget, Output, WavOutputFormat } from "mediabunny";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    model: { type: "string", default: "large-v3-turbo" },
    lang: { type: "string" },
  },
});

if (!values.lang) {
  throw new Error("Укажи язык озвучки: npm run transcribe -- <файл> --lang ru  (или en, es, de…). Язык спроси у пользователя — не угадывай.");
}

const AUDIO_EXT = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".mp4", ".mov"];

let file = positionals[0];
if (!file) {
  // ищем озвучку в папке input/
  const files = await readdir("input").catch(() => [] as string[]);
  const found = files.find((f) => AUDIO_EXT.includes(path.extname(f).toLowerCase()));
  if (!found) throw new Error("Положи озвучку в папку input/ или укажи файл: npm run transcribe -- путь/к/voice.mp3");
  file = path.join("input", found);
}

registerMediabunnyServer();
const support = await canUseWhisperWebGpu();
if (!support.supported) {
  throw new Error(`Whisper не может использовать видеокарту: ${support.detailedReason}`);
}

const chunks: { startFrame: number; waveform: Float32Array }[] = [];
using input = new Input({ formats: ALL_FORMATS, source: new FilePathSource(file) });
const audioTrack = await input.getPrimaryAudioTrack();
if (audioTrack === null) throw new Error("В файле нет звука.");

const conversion = await Conversion.init({
  input,
  output: new Output({ format: new WavOutputFormat(), target: new NullTarget() }),
  video: { discard: true },
  audio: (track) => {
    if (track.id !== audioTrack.id) return { discard: true };
    return {
      codec: "pcm-f32",
      forceTranscode: true,
      numberOfChannels: 1,
      sampleFormat: "f32",
      sampleRate: WHISPER_WEBGPU_SAMPLE_RATE,
      process: (sample) => {
        const waveform = new Float32Array(sample.allocationSize({ format: "f32", planeIndex: 0 }) / Float32Array.BYTES_PER_ELEMENT);
        sample.copyTo(waveform, { format: "f32", planeIndex: 0 });
        chunks.push({ startFrame: Math.round(sample.timestamp * WHISPER_WEBGPU_SAMPLE_RATE), waveform });
        return sample;
      },
    };
  },
});
if (!conversion.isValid) throw new Error("Не получилось прочитать аудио.");
await conversion.execute();

const total = chunks.reduce((m, c) => Math.max(m, c.startFrame + c.waveform.length), 0);
const channelWaveform = new Float32Array(total);
for (const c of chunks) {
  const dst = Math.max(0, c.startFrame);
  const src = Math.max(0, -c.startFrame);
  const len = Math.min(c.waveform.length - src, channelWaveform.length - dst);
  if (len > 0) channelWaveform.set(c.waveform.subarray(src, src + len), dst);
}
const duration = total / WHISPER_WEBGPU_SAMPLE_RATE;

// Модель (~4 ГБ) храним в общей папке пользователя, а не в node_modules проекта:
// иначе она скачивалась бы заново для каждого нового ролика
const { env } = await import("@huggingface/transformers");
env.cacheDir = path.join(os.homedir(), ".cache", "stickman-studio", "whisper");
await mkdir(env.cacheDir, { recursive: true });

const model = values.model as WhisperWebGpuModel;
console.log(`Модель ${model}, язык ${values.lang}, длина ${duration.toFixed(1)} c. Модель: ${env.cacheDir}`);
await downloadWhisperModel({ model });
await using handle = await loadWhisperModel({ model });
console.log("Распознаю речь...");
const result = await transcribe({ channelWaveform, model, language: values.lang });
const { captions } = toCaptions({ whisperWebGpuOutput: result });

const words = captions
  .map((c) => ({ text: c.text.trim(), start: +(c.startMs / 1000).toFixed(3), end: +(c.endMs / 1000).toFixed(3) }))
  .filter((w) => w.text.length > 0);

// Копия озвучки в public/ — оттуда её берёт рендер
const ext = path.extname(file).toLowerCase();
await mkdir(path.join("public", "audio"), { recursive: true });
const voicePath = `audio/voice${ext}`;
await copyFile(file, path.join("public", voicePath));

// Читаемая версия для режиссуры: фразы с таймингом
const lines: string[] = [];
let cur: typeof words = [];
words.forEach((w, i) => {
  cur.push(w);
  const next = words[i + 1];
  const gap = next ? next.start - w.end : 99;
  if (/[.!?]$/.test(w.text) || gap > 0.8 || cur.length >= 22) {
    lines.push(`[${cur[0].start.toFixed(2)} - ${cur[cur.length - 1].end.toFixed(2)}] ${cur.map((x) => x.text).join(" ")}`);
    cur = [];
  }
});

await mkdir("data", { recursive: true });
await writeFile("data/transcript.json", JSON.stringify({ duration: +duration.toFixed(3), voice: voicePath, language: values.lang, words }, null, 2));
await writeFile("data/transcript.txt", `duration: ${duration.toFixed(2)} s\nvoice: ${voicePath}\n\n${lines.join("\n")}\n`);
console.log(`Готово: ${words.length} слов, ${lines.length} фраз -> data/transcript.json, data/transcript.txt`);
console.log(`\nНачало текста (${values.lang}):\n${lines.slice(0, 3).join("\n")}`);
console.log("\nПроверь: текст осмысленный и на том языке, на котором говорят в озвучке? Если нет — язык указан неверно, перезапусти с правильным --lang.");
