// Light + grade per set of «100%». The world runs on the bridge skill's two-tone shading (shade.ts) and card
// shading (cardshade.ts); these presets are the night / interior versions of its day and golden looks:
// a cool key in the hangar and at the stadium, a warm lamp in the room, a lone top light in the void and a warm
// backlight for the finale. bg = clear colour (no sky in our sets), fog = the same colour so far walls sink into it.
import type { LightPreset } from "./lights";
import type { GradeParams } from "./grade";

export type Mood = "hangar" | "room" | "stadium" | "void" | "warm";
type C3 = [number, number, number];
const base = (o: Partial<LightPreset> & { lit: C3; shade: C3; charTint: C3; fog: string }): LightPreset => ({
  az: 60, el: 50, lift: [0.02, 0.02, 0.05], lambert: 0.35, sideK: 0.84, term: 0.2,
  charShade: 0.8, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.9, 0.9, 0.98],
  blob: [0.5, 0.5, 0.6], actorShadow: true,
  top: "#000000", hor: "#000000", skyCurve: [0, 0.5, 0.6], fogNear: 18, fogFar: 70, sunDisc: "#000000",
  sunCol: "#ffffff", sunI: 2.6, sky: "#8090b0", ground: "#303038", hemiI: 0.4,
  bias: -0.0004, normalBias: 0.02,
  ...o,
});
export const MOODS: Record<Mood, LightPreset & { bg: string }> = {
  hangar: { ...base({ az: 120, el: 55, lit: [1.25, 1.32, 1.5], shade: [0.13, 0.13, 0.22], charTint: [0.94, 0.97, 1.0], fog: "#0c0e15", fogNear: 16, fogFar: 60 }), bg: "#0b0d14" },
  room: { ...base({ az: 110, el: 60, lit: [1.55, 1.25, 0.9], shade: [0.2, 0.15, 0.24], charTint: [1.0, 0.92, 0.8], fog: "#1c1519", fogNear: 10, fogFar: 40, lift: [0.04, 0.03, 0.06] }), bg: "#1a1418" },
  stadium: { ...base({ az: 140, el: 40, lit: [1.35, 1.4, 1.55], shade: [0.14, 0.15, 0.25], charTint: [0.95, 0.98, 1.0], fog: "#0f1424", fogNear: 25, fogFar: 110 }), bg: "#0e1322" },
  void: { ...base({ az: 170, el: 78, lit: [1.05, 1.1, 1.25], shade: [0.04, 0.04, 0.08], charTint: [0.86, 0.9, 1.0], charShade: 0.7, fog: "#05060a", fogNear: 8, fogFar: 45, lift: [0.0, 0.0, 0.02] }), bg: "#040509" },
  warm: { ...base({ az: 10, el: 18, lit: [1.7, 1.25, 0.82], shade: [0.16, 0.13, 0.24], charTint: [1.0, 0.88, 0.74], fog: "#1a1210", fogNear: 10, fogFar: 60, actorShadow: true }), bg: "#140e0d" },
};
const g = (ky: number[], sat: C3, tintS: [number, number], tintH: [number, number], vig: [number, number]): GradeParams =>
  ({ ky, sat, tintS, tintM: [0, 0], tintH, vig });
export const MGRADE: Record<Mood, GradeParams> = {
  hangar: g([0, 0.08, 0.24, 0.55, 0.82, 0.94, 1], [1.0, 1.08, 1.1], [0.03, -0.005], [0, 0], [0.3, 0.35]),
  room: g([0, 0.09, 0.26, 0.57, 0.83, 0.94, 1], [1.0, 1.05, 1.05], [0.025, 0.01], [-0.01, 0.01], [0.28, 0.35]),
  stadium: g([0, 0.08, 0.25, 0.56, 0.83, 0.95, 1], [1.0, 1.1, 1.1], [0.035, -0.01], [0, 0], [0.25, 0.4]),
  void: g([0, 0.06, 0.2, 0.5, 0.8, 0.94, 1], [0.9, 0.95, 1.0], [0.03, 0], [0, 0], [0.4, 0.3]),
  warm: g([0, 0.09, 0.26, 0.58, 0.85, 0.95, 1], [1.0, 1.1, 1.12], [0.03, 0.01], [-0.02, 0.012], [0.3, 0.38]),
};
