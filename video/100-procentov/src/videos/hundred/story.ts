// «Что, если твой шанс на победу всегда 100%?» — timeline. Every shot is timed to the padded voice
// (data/words.json, see scripts/pad-voice.mjs). Camera grammar from the cartoon-short skill: cuts on big jumps,
// smootherstep glides of 18-40 f, every hold creeps in, impact kicks flip sign every frame and decay over 7 f.
import type { Mood } from "./mood";

export const FPS = 30;
export const DURATION = 58.58;
export const TOTAL = Math.ceil(DURATION * FPS);
export type V3 = [number, number, number];
export type SetName = "hangar" | "room" | "stadium" | "void";

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
/** 0 -> 1 between seconds a and b (smootherstep) */
export const ramp = (t: number, a: number, b: number) => glide((t - a) / (b - a));
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
const F = (s: number) => Math.round(s * FPS);

// ---------------- shots ----------------
export type ShotDef = { id: number; a: number; b: number; set: SetName; mood: Mood };
const S = (id: number, a: number, b: number, set: SetName, mood: Mood): ShotDef => ({ id, a: F(a), b: id === 17 ? TOTAL : F(b), set, mood });
export const SHOTS: ShotDef[] = [
  S(1, 0, 4.0, "hangar", "hangar"),      // А что, если бы ты знал, что всегда победишь?  (button slam, 100% ПОБЕДА)
  S(2, 4.0, 5.2, "hangar", "hangar"),    // Не иногда.  (coin toss)
  S(3, 5.2, 6.6, "hangar", "hangar"),    // Не почти всегда.  (jump, counter)
  S(4, 6.6, 9.6, "hangar", "hangar"),    // А абсолютно всегда.  (fly into the 100 %)
  S(5, 9.6, 11.8, "room", "room"),       // Ты выигрываешь каждую игру.  (chess, king falls)
  S(6, 11.8, 13.35, "room", "room"),     // Каждый спор.  (debate gauge)
  S(7, 13.35, 15.45, "stadium", "stadium"), // Каждое соревнование.  (race, tape)
  S(8, 15.45, 19.45, "stadium", "stadium"), // Ты больше не боишься проиграть.  (podium, fear 0 %)
  S(9, 19.45, 23.9, "stadium", "stadium"),  // Но если ты знаешь результат заранее, зачем вообще стараться?
  S(10, 23.9, 25.85, "room", "room"),    // Зачем учиться?  (books fall, skill drops)
  S(11, 25.85, 30.05, "hangar", "hangar"), // Зачем рисковать?  (screen error)
  S(12, 30.05, 34.25, "void", "void"),   // Победа без риска превращается в привычку.  (pillars rise)
  S(13, 34.25, 37.95, "void", "void"),   // А привычка побеждать может лишить тебя самого главного —  (cage, fall)
  S(14, 37.95, 42.05, "void", "void"),   // желания расти.  (warm beam, gets up)
  S(15, 42.05, 46.95, "hangar", "hangar"), // Возможно, настоящий шанс на победу — не сто процентов.  (pulls the plug)
  S(16, 46.95, 54.4, "void", "warm"),    // А готовность попробовать, даже если ты не знаешь результата.  (tiles)
  S(17, 54.4, 0, "void", "warm"),        // А ты рискнул бы?  (into the light)
];
/** crossfades (frames) where the place changes softly */
export const XFADE: Record<number, number> = { 12: 12, 14: 0, 16: 14 };
/** white flashes: hook end, error */
export const FLASHES = [F(9.6), F(27.0)];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state (seconds) ----------------
export const T = {
  slam: 0.45, coinUp: 4.1, jump: 5.45, flyIn: 8.0,
  kingFalls: 10.85, debateWin: 12.3,
  tapeX: 0, raceT0: 13.35, cross: 14.3,
  fear0: 16.0, fear1: 17.3,
  board: 20.3, rivalFall: 22.6,
  books: 24.35, skill0: 24.2, skill1: 25.5,
  lazyPress: 26.25, error: 26.9,
  rise0: 30.6, rise1: 32.2, close0: 34.6, close1: 36.2, fall: 36.75,
  beam: 38.1, sit: 39.0, stand: 39.8, reach: 40.5, crack: 40.9,
  pull: 45.1, yank: 45.7,
  firstStep: 48.2, walkV: 1.35, rivalIn: 52.4,
  white0: 55.4, white1: 56.4, dark: 57.0, ask: 54.75,
};

// race (shot 7): hero runs +x at 6.4 m/s, crossing the line at T.cross, then slows down
export const heroRaceX = (t: number) => (t < T.cross ? (t - T.cross) * 6.4 : 6.4 * 0.55 * (1 - Math.exp(-(t - T.cross) / 0.55)));
export const rivalRaceX = (t: number) => heroRaceX(t) - 1.5 - 0.6 * clamp01((t - 13.6) / 0.8);
// lazy walk (shot 9): hero strolls toward the line, rival sprints past and collapses
export const lazyX = (t: number) => -4.2 + 0.55 * Math.max(0, t - 21.3);
export const sprintX = (t: number) => (t < T.rivalFall ? -11 + 6.2 * (t - 21.0) : -11 + 6.2 * (T.rivalFall - 21.0) + 1.2 * easeOut((t - T.rivalFall) / 0.5));
// pillars (void): rise, then close in around the hero
export const pillarY = (t: number) => -7.6 * (1 - ramp(t, T.rise0, T.rise1));
export const pillarR = (t: number) => 3.6 - 2.15 * ramp(t, T.close0, T.close1);
// final walk (shot 16-17): hero z on the path of tiles
export const walkZ = (t: number) => 5 - T.walkV * Math.max(0, t - T.firstStep);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const sec = (f: number) => f / FPS;
/** creeping push-in since f0 (rate per frame, punch for the first n frames) */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 30) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: (f) => dolly([1.6, 0.75, 1.0], [0.35, 1.45, -2.0], pushK(f, 0, 0.004, 0.012, 20), { fov: 44, roll: 0.06 }) },
    { f: F(1.15), cut: true, s: (f) => dolly([-2.6, 1.9, 8.2], [0.2, 4.6, -7], pushK(f, F(1.15), 0.0022), { fov: 50 }) },
  ],
  2: [{ f: F(4.0), s: (f) => dolly([0.5, 1.55, 2.2], [0.25, 1.75, -2.0], pushK(f, F(4.0), 0.003), { fov: 42, roll: -0.04 }) }],
  3: [{ f: F(5.2), s: (f) => dolly([-2.0, 1.1, 2.4], [0.2, 1.9, -2.4], pushK(f, F(5.2), 0.003), { fov: 44, roll: 0.05 }) }],
  4: [
    { f: F(6.6), s: (f) => dolly([0.2, 1.7, 3.4], [0.0, 4.2, -9.3], pushK(f, F(6.6), 0.002), { fov: 48 }) },
    { f: F(T.flyIn), dur: F(1.6), s: () => ({ pos: [-0.7, 6.25, -7.6], look: [-0.7, 6.25, -9.4], fov: 40, roll: 0.03 }) },
  ],
  5: [
    { f: F(9.6), s: (f) => dolly([0.1, 1.75, 3.7], [0, 1.1, -1.6], pushK(f, F(9.6), 0.002), { fov: 46 }) },
    { f: F(10.65), cut: true, s: (f) => dolly([0.55, 1.15, -0.55], [0.12, 0.86, -1.6], pushK(f, F(10.65), 0.003), { fov: 36, roll: -0.04 }) },
  ],
  6: [{ f: F(11.8), s: (f) => dolly([0.1, 1.8, 4.5], [0, 1.8, -0.6], pushK(f, F(11.8), 0.0025, 0.008, 24), { fov: 46 }) }],
  7: [{ f: F(13.35), s: (f) => { const x = heroRaceX(sec(f)); const cx = Math.min(x, 1.6); return { pos: [cx + 1.8, 1.25, 6.6], look: [cx + 0.6, 1.15, 0.6], fov: 40, roll: -0.03 }; } }],
  8: [
    { f: F(15.45), s: (f) => dolly([1.4, 0.8, 4.4], [0.3, 2.0, -3.0], pushK(f, F(15.45), 0.0022), { fov: 44, roll: 0.04 }) },
    { f: F(T.fear0 - 0.3), dur: 30, s: (f) => dolly([0.9, 2.0, 3.0], [0.45, 2.45, -3.0], pushK(f, F(T.fear0), 0.0025, 0.006, 30), { fov: 44 }) },
  ],
  9: [
    { f: F(19.45), s: (f) => dolly([3.2, 2.0, 8.5], [-0.5, 4.2, -12], pushK(f, F(19.45), 0.002), { fov: 48 }) },
    { f: F(21.4), cut: true, s: (f) => { const x = lazyX(sec(f)); return dolly([x + 1.2, 1.5, 4.3], [x + 0.3, 1.45, 0.2], pushK(f, F(21.4), 0.0015), { fov: 42, roll: 0.03 }); } },
  ],
  10: [
    { f: F(23.9), s: (f) => dolly([-0.4, 1.55, 2.6], [-1.0, 1.1, -1.6], pushK(f, F(23.9), 0.003), { fov: 42 }) },
    { f: F(24.9), dur: 24, s: (f) => dolly([0.8, 1.8, 0.8], [1.6, 2.2, -4.4], pushK(f, F(24.9), 0.003), { fov: 40, roll: -0.04 }) },
  ],
  11: [
    { f: F(25.85), s: (f) => dolly([1.5, 1.3, 1.6], [0.35, 1.5, -2.0], pushK(f, F(25.85), 0.0025), { fov: 42 }) },
    { f: F(T.error - 0.05), cut: true, s: (f) => dolly([-1.4, 1.5, 5.6], [0.2, 4.4, -8], pushK(f, F(T.error), 0.002, 0.008, 25), { fov: 46, roll: -0.05 }) },
  ],
  12: [
    { f: F(29.65), s: () => ({ pos: [0.6, 10.5, 8.5], look: [0, 0, 0], fov: 44 }) },
    { f: F(30.5), dur: F(1.9), s: (f) => dolly([3.2, 2.0, 7.2], [0, 2.2, 0], pushK(f, F(32.4), 0.0018), { fov: 46 }) },
  ],
  13: [
    { f: F(34.25), s: (f) => dolly([0, 1.75, 4.6], [0, 1.45, 0], pushK(f, F(34.25), 0.0025), { fov: 42, roll: 0.03 }) },
    { f: F(36.3), dur: 20, s: (f) => dolly([-0.25, 3.2, 3.4], [-0.3, 0.45, 0], pushK(f, F(36.3), 0.003), { fov: 46, roll: -0.06 }) },
  ],
  14: [
    { f: F(37.95), s: (f) => dolly([-0.25, 3.2, 3.4], [-0.3, 0.45, 0], pushK(f, F(37.95), 0.0018), { fov: 46, roll: -0.04 }) },
    { f: F(39.4), dur: 36, s: (f) => dolly([0, 0.9, 3.9], [-0.2, 1.55, 0], pushK(f, F(39.4), 0.002), { fov: 44 }) },
  ],
  15: [
    { f: F(42.05), s: (f) => dolly([-1.2, 1.4, 4.6], [0.1, 4.0, -9], pushK(f, F(42.05), 0.0022), { fov: 48 }) },
    { f: F(44.9), cut: true, s: (f) => dolly([2.3, 1.45, -2.4], [4.0, 1.25, -5.6], pushK(f, F(44.9), 0.0025), { fov: 42, roll: 0.04 }) },
    { f: F(46.0), dur: 26, s: (f) => dolly([-0.5, 2.0, 2.0], [0.6, 4.2, -9], pushK(f, F(46.0), 0.002), { fov: 48 }) },
  ],
  16: [
    { f: F(46.95), s: (f) => dolly([1.5, 1.05, 8.9], [0, 1.6, 4.0], pushK(f, F(46.95), 0.0025), { fov: 44 }) },
    { f: F(48.9), dur: 40, s: (f) => { const z = walkZ(sec(f)); return { pos: [3.4, 1.55, z + 4.2], look: [0.1, 1.65, z - 1.6], fov: 44, roll: 0.02 }; } },
    { f: F(52.2), cut: true, s: (f) => { const z = walkZ(sec(f)); return dolly([0.9, 1.0, z + 5.4], [0, 2.4, z - 14], pushK(f, F(52.2), 0.0015), { fov: 46 }); } },
  ],
  17: [{ f: F(54.4), s: (f) => { const z = walkZ(sec(f)); return dolly([0.5, 1.3, z + 6.6], [0, 2.6, -20], pushK(f, F(54.4), 0.0028), { fov: 46 }); } }],
};

/** impact kicks: [second, gain] */
const KICKS: [number, number][] = [[T.slam, 1.4], [T.kingFalls + 0.2, 0.5], [T.cross, 0.7], [T.rivalFall + 0.35, 0.6], [T.error, 1.6], [27.5, 0.8], [T.rise1, 0.9], [T.close1, 0.8], [T.fall + 0.55, 1.2], [T.yank, 1.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(sec(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 12, focus: () => [0.2, 1.4, -1.95] },
  { f: F(1.15), cInf: 0 },
  { f: F(4.0), cInf: 11, focus: () => [0.1, 1.6, -1.95] },
  { f: F(6.6), cInf: 0 },
  { f: F(9.6), cInf: 8 },
  { f: F(10.65), cInf: 14, focus: () => [0.12, 0.86, -1.6] },
  { f: F(11.8), cInf: 9, focus: () => [0, 1.6, -0.3] },
  { f: F(13.35), cInf: 7, focus: (f) => [heroRaceX(sec(f)), 1.2, 0.4] },
  { f: F(15.45), cInf: 6 },
  { f: F(19.45), cInf: 0 },
  { f: F(21.4), cInf: 10, focus: (f) => [lazyX(sec(f)), 1.4, 0.3] },
  { f: F(23.9), cInf: 9 },
  { f: F(25.85), cInf: 10, focus: () => [0.1, 1.5, -1.95] },
  { f: F(T.error - 0.05), cInf: 0 },
  { f: F(30.05), cInf: 0 },
  { f: F(34.25), cInf: 12, focus: () => [0, 1.5, 0] },
  { f: F(36.3), dur: 20, cInf: 6 },
  { f: F(39.4), dur: 36, cInf: 12, focus: () => [0, 1.5, 0] },
  { f: F(42.05), cInf: 0 },
  { f: F(44.9), cInf: 12, focus: () => [3.9, 1.3, -5.5] },
  { f: F(46.0), dur: 26, cInf: 0 },
  { f: F(46.95), cInf: 10, focus: (f) => [0, 1.5, walkZ(sec(f))] },
  { f: F(52.2), cInf: 6, focus: (f) => [0, 1.5, walkZ(sec(f))] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

// ---------------- sound cues (seconds, file in public/sfx, gain dB) ----------------
export const SFX: [number, string, number][] = [
  [0.0, "whoosh", -4], [T.slam, "impact", 0], [0.6, "rise", -6], [1.2, "ding", -6], [1.9, "click", -8],
  [4.2, "swoosh", -6], [4.75, "ding", -4], [5.5, "pop", -4], [5.9, "ding", -3], [6.25, "sparkle", -6],
  [7.2, "rise", -4], [9.55, "impact", -2],
  [10.85, "thud", -4], [11.0, "pop", -8], [12.3, "ding", -5], [12.35, "cash", -8],
  [13.35, "whoosh", -6], [14.3, "impact", -4], [14.4, "sparkle", -6], [16.0, "swoosh", -8], [17.3, "ding", -6],
  [20.3, "click", -4], [20.35, "pop", -6], [22.6, "thud", -2], [24.35, "thud", -4], [24.6, "thud", -6], [25.0, "buzz", -8],
  [26.25, "click", -2], [26.9, "glitch", 0], [27.5, "glitch", -3], [28.4, "heartbeat", -2], [29.3, "heartbeat", -4],
  [30.6, "rise", -6], [32.2, "impact", -3], [34.6, "rise", -8], [36.2, "impact", -4], [37.3, "thud", -2], [37.9, "heartbeat", -4],
  [38.1, "sparkle", -6], [40.9, "glitch", -10],
  [45.7, "impact", -2], [45.75, "glitch", -4], [46.2, "buzz", -10],
  [48.2, "pop", -10], [48.95, "pop", -10], [49.7, "pop", -10], [50.2, "ding", -6], [50.45, "pop", -10], [51.2, "pop", -10], [51.95, "pop", -10],
  [52.7, "pop", -10], [53.45, "pop", -10], [55.2, "rise", -6], [56.4, "sparkle", -6], [57.0, "impact", -8],
];
