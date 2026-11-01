// Проверка data/project.json перед рендером. Запуск: npm run validate
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const LOCATIONS = ["street", "plaza", "cafe", "lab", "room", "office", "park", "stage", "hospital", "studio"];
const ACTIONS = ["idle", "walk", "run", "wave", "point", "cheer", "shrug", "think", "scared", "fall", "lie", "sit", "jump", "talk", "facepalm", "dance", "cry", "angry"];
const FACES = ["neutral", "happy", "grin", "sad", "scared", "angry", "surprised", "sleepy", "smirk", "worried"];
const PROPS = ["bottle", "table", "chair", "tree", "car", "sign", "box", "coin", "bench", "lamp", "screen", "bed", "door", "plant", "rock", "clock", "money", "trophy", "syringe", "phone"];
const SHOTS = ["wide", "medium", "close", "extreme"];
const MOVES = ["static", "dolly-in", "dolly-out", "pan-left", "pan-right", "orbit", "push", "rise", "shake"];
const SFX = ["whoosh", "swoosh", "rise", "pop", "click", "ding", "thud", "impact", "tick", "glitch", "heartbeat", "sparkle", "buzz", "boing", "scribble", "cash"];
const HAIR = ["none", "puff", "bob", "bun", "cap", "headband"];
const HELD = ["none", "phone", "bottle", "sign", "cup", "coin", "book"];
const TRANS = ["cut", "fade", "whip", "flash"];

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

let p;
try {
  p = JSON.parse(readFileSync("data/project.json", "utf8"));
} catch (e) {
  console.error("data/project.json не читается:", e.message);
  process.exit(1);
}

if (!p.scenes?.length) err("Нет сцен (scenes пустой)");
if (!p.audio?.voice) err("audio.voice не указан");
else if (!existsSync(path.join("public", p.audio.voice))) err(`Нет файла озвучки public/${p.audio.voice}`);
if (!existsSync("public/sfx/whoosh.wav")) warn("Нет звуков в public/sfx — запусти npm run sfx");

// Длина WAV по заголовку (для mp3 и прочих — null)
const wavSeconds = (rel) => {
  const f = path.join("public", rel);
  if (!rel.toLowerCase().endsWith(".wav") || !existsSync(f)) return null;
  const b = readFileSync(f);
  let pos = 12;
  let byteRate = 0;
  while (pos + 8 <= b.length) {
    const id = b.toString("ascii", pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === "fmt ") byteRate = b.readUInt32LE(pos + 16);
    if (id === "data") return byteRate ? size / byteRate : null;
    pos += 8 + size + (size % 2);
  }
  return null;
};

const parts = p.audio?.musicParts ?? [];
if (parts.length) {
  if (parts[0].from > 0.5) err(`musicParts: первая часть должна начинаться с 0, а не с ${parts[0].from}`);
  parts.forEach((m, i) => {
    if (!existsSync(path.join("public", m.src))) err(`musicParts[${i}]: нет файла public/${m.src} (сгенерируй: npm run music -- --all)`);
    if (i > 0 && m.from <= parts[i - 1].from) err(`musicParts[${i}]: from должен расти по порядку`);
    const len = (parts[i + 1]?.from ?? p.duration) - m.from;
    const sec = wavSeconds(m.src);
    if (sec !== null && sec + 1 < len) warn(`musicParts[${i}]: трек ${sec.toFixed(0)} c на главу ${len.toFixed(0)} c — будет повторяться по кругу. Если глава длинная, сгенерируй трек длиннее: npm run music -- --mood … --seconds ${Math.ceil(len + 3)} --out public/${m.src}`);
  });
} else if (p.audio?.music) {
  if (!existsSync(path.join("public", p.audio.music))) err(`Нет файла музыки public/${p.audio.music} (сгенерируй: npm run music)`);
  const sec = wavSeconds(p.audio.music);
  if (sec !== null && p.duration && sec + 1 < p.duration) {
    err(`Музыка ${sec.toFixed(0)} c короче ролика ${p.duration.toFixed(0)} c и будет крутиться по кругу. Сгенерируй под длину ролика: npm run music -- --mood <настроение>  (или музыку по главам: npm run music -- --all + audio.musicParts)`);
  }
} else {
  warn("Музыки нет. Если пользователь не просил «без музыки» — спроси его и добавь музыку.");
}

const checkActor = (a, where, len) => {
  if (!a.id) err(`${where}: у актёра нет id`);
  if (a.action && !ACTIONS.includes(a.action)) err(`${where} ${a.id}: неизвестное действие "${a.action}"`);
  if (a.face && !FACES.includes(a.face)) err(`${where} ${a.id}: неизвестное лицо "${a.face}"`);
  if (a.hair && !HAIR.includes(a.hair)) err(`${where} ${a.id}: неизвестная причёска "${a.hair}"`);
  if (a.held && !HELD.includes(a.held)) err(`${where} ${a.id}: неизвестный предмет в руке "${a.held}"`);
  if (a.print && !["none", "dino"].includes(a.print)) err(`${where} ${a.id}: неизвестный принт "${a.print}" (есть: none, dino)`);
  if (Math.abs(a.x) > 25 || a.z > 8 || a.z < -12) warn(`${where} ${a.id}: стоит далеко от кадра (x=${a.x}, z=${a.z})`);
  (a.beats ?? []).forEach((b) => {
    if (b.action && !ACTIONS.includes(b.action)) err(`${where} ${a.id}: неизвестное действие в beats "${b.action}"`);
    if (b.face && !FACES.includes(b.face)) err(`${where} ${a.id}: неизвестное лицо в beats "${b.face}"`);
    if (b.at < 0 || b.at > len + 0.01) warn(`${where} ${a.id}: beat at=${b.at} за пределами сцены (длина ${len.toFixed(2)})`);
  });
};

const checkProps = (props, where) =>
  (props ?? []).forEach((pr) => {
    if (!PROPS.includes(pr.type)) err(`${where}: неизвестный предмет "${pr.type}"`);
  });

const checkCamera = (c, actors, where) => {
  if (!c) return;
  if (c.shot && !SHOTS.includes(c.shot)) err(`${where}: неизвестный план "${c.shot}"`);
  if (c.move && !MOVES.includes(c.move)) err(`${where}: неизвестное движение камеры "${c.move}"`);
  if (typeof c.target === "string" && !actors.some((a) => a.id === c.target)) err(`${where}: камера смотрит на "${c.target}", но такого актёра нет`);
};

let prevEnd = 0;
(p.scenes ?? []).forEach((s, i) => {
  const w = `Сцена ${i + 1} [${s.start}-${s.end}]`;
  const len = s.end - s.start;
  if (!(len > 0)) err(`${w}: end должен быть больше start`);
  if (len < 0.8) warn(`${w}: очень короткая (${len.toFixed(2)} c)`);
  if (len > 9) warn(`${w}: длинная (${len.toFixed(1)} c) — зритель заскучает, раздели на 2–3 плана`);
  if (Math.abs(s.start - prevEnd) > 0.05) err(`${w}: ${s.start > prevEnd ? "дыра" : "наложение"} с предыдущей сценой (${prevEnd.toFixed(2)} → ${s.start})`);
  prevEnd = s.end;
  if (s.split) {
    ["left", "right"].forEach((side) => {
      const sub = s.split[side];
      if (!sub) return err(`${w}: в split нет ${side}`);
      if (sub.location && !LOCATIONS.includes(sub.location)) err(`${w} ${side}: неизвестная локация "${sub.location}"`);
      (sub.actors ?? []).forEach((a) => checkActor(a, `${w} ${side}`, len));
      checkProps(sub.props, `${w} ${side}`);
      checkCamera(sub.camera, sub.actors ?? [], `${w} ${side}`);
    });
  } else {
    if (!LOCATIONS.includes(s.location ?? "studio")) err(`${w}: неизвестная локация "${s.location}"`);
    (s.actors ?? []).forEach((a) => checkActor(a, w, len));
    checkProps(s.props, w);
    checkCamera(s.camera, s.actors ?? [], w);
    if (s.crowd && (s.crowd.count > 40)) warn(`${w}: толпа ${s.crowd.count} — рендер будет медленным, лучше до 25`);
  }
  if (s.transition && !TRANS.includes(s.transition)) err(`${w}: неизвестный переход "${s.transition}"`);
  (s.sfx ?? []).forEach((x) => {
    if (!SFX.includes(x.name)) err(`${w}: нет звука "${x.name}" (есть: ${SFX.join(", ")})`);
  });
  if (s.title?.text && s.title.text.length > 40) warn(`${w}: длинный титр — лучше 1–3 слова`);
});
if (p.duration && Math.abs(prevEnd - p.duration) > 0.3) err(`Последняя сцена заканчивается на ${prevEnd.toFixed(2)}, а duration = ${p.duration}`);

const scenes = p.scenes ?? [];
const locs = scenes.filter((s) => !s.split).map((s) => s.location);
for (let i = 2; i < locs.length; i++) {
  if (locs[i] === locs[i - 1] && locs[i] === locs[i - 2] && scenes[i].camera?.shot === scenes[i - 1].camera?.shot) {
    warn(`Сцены ${i - 1}–${i + 1}: три подряд одинаковых плана в одной локации — смени план или ракурс`);
  }
}

warns.forEach((m) => console.log("ВНИМАНИЕ:", m));
errors.forEach((m) => console.log("ОШИБКА:", m));
console.log(`\nСцен: ${scenes.length}, длина ${prevEnd.toFixed(1)} c. Ошибок: ${errors.length}, предупреждений: ${warns.length}`);
process.exit(errors.length ? 1 : 0);
