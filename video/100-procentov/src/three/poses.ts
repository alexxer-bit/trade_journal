import type { ActionName } from "../types";
import { clamp, easeInOut, easeOut, lerp } from "../util";

// Углы суставов в радианах. L — левая рука/нога персонажа (+X, когда он смотрит в камеру).
// Fwd: вперёд (+) / назад (−). Out: в сторону от тела. Elbow/Knee: сгиб.
export type Pose = {
  lean: number; // наклон корпуса вперёд
  twist: number; // поворот корпуса
  headX: number; // кивок (+ вниз)
  headY: number; // поворот головы
  headZ: number; // наклон к плечу
  lFwd: number;
  lOut: number;
  lElbow: number;
  rFwd: number;
  rOut: number;
  rElbow: number;
  lHip: number;
  lHipOut: number;
  lKnee: number;
  rHip: number;
  rHipOut: number;
  rKnee: number;
  bob: number; // смещение таза по высоте
  rootX: number; // падение вперёд/назад (вращение у стоп)
  rootZ: number; // покачивание вбок
  lift: number; // прыжок: подъём всего тела
};

export const REST: Pose = {
  lean: 0,
  twist: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  lFwd: 0,
  lOut: 0.1,
  lElbow: 0.15,
  rFwd: 0,
  rOut: 0.1,
  rElbow: 0.15,
  lHip: 0,
  lHipOut: 0.03,
  lKnee: 0,
  rHip: 0,
  rHipOut: 0.03,
  rKnee: 0,
  bob: 0,
  rootX: 0,
  rootZ: 0,
  lift: 0,
};

const P = (o: Partial<Pose>): Pose => ({ ...REST, ...o });
const TAU = Math.PI * 2;
const S = Math.sin;

// Скорость перемещения (единиц в секунду) для действий с "to"
export const MOVE_SPEED: Partial<Record<ActionName, number>> = { walk: 1.5, run: 4.2, dance: 0 };

// t — секунды от начала действия, seed — индивидуальный сдвиг, чтобы толпа не двигалась синхронно
export const poseFor = (action: ActionName, t: number, seed: number): Pose => {
  const breathe = S((t + seed) * TAU * 0.33);
  switch (action) {
    case "idle":
      return P({
        bob: 0.012 * breathe,
        headZ: 0.03 * S((t + seed) * 0.7),
        lOut: 0.1 + 0.02 * breathe,
        rOut: 0.1 + 0.02 * breathe,
        lElbow: 0.18,
        rElbow: 0.18,
      });
    case "walk": {
      const p = (t + seed * 0.1) * TAU * 1.7;
      return P({
        lean: 0.06,
        lHip: 0.45 * S(p),
        rHip: -0.45 * S(p),
        lKnee: 0.15 + 0.7 * Math.max(0, Math.cos(p)),
        rKnee: 0.15 + 0.7 * Math.max(0, -Math.cos(p)),
        lFwd: -0.45 * S(p),
        rFwd: 0.45 * S(p),
        lElbow: 0.35,
        rElbow: 0.35,
        bob: -0.03 + 0.035 * Math.abs(Math.cos(p)),
        headZ: 0.03 * S(p),
      });
    }
    case "run": {
      const p = (t + seed * 0.1) * TAU * 2.7;
      return P({
        lean: 0.28,
        headX: -0.15,
        lHip: 0.85 * S(p),
        rHip: -0.85 * S(p),
        lKnee: 0.35 + 1.25 * Math.max(0, Math.cos(p)),
        rKnee: 0.35 + 1.25 * Math.max(0, -Math.cos(p)),
        lFwd: -0.95 * S(p),
        rFwd: 0.95 * S(p),
        lElbow: 1.5,
        rElbow: 1.5,
        bob: -0.06 + 0.09 * Math.abs(S(p)),
      });
    }
    case "wave": {
      const k = easeOut(clamp(t / 0.3));
      return P({
        bob: 0.01 * breathe,
        rOut: lerp(0.1, 2.5, k),
        rFwd: 0.25 * k,
        rElbow: lerp(0.2, 0.55 + 0.45 * S(t * TAU * 2.2), k),
        headZ: 0.12 * k,
        lElbow: 0.2,
      });
    }
    case "point": {
      const k = easeOut(clamp(t / 0.3));
      return P({
        rFwd: 1.5 * k,
        rOut: 0.15,
        rElbow: 0.05,
        lean: 0.04,
        headY: 0.1 * k,
        bob: 0.01 * breathe,
      });
    }
    case "cheer": {
      const k = easeOut(clamp(t / 0.25));
      const b = Math.abs(S(t * TAU * 1.6));
      return P({
        lOut: 2.7 * k + 0.15 * S(t * TAU * 3),
        rOut: 2.7 * k - 0.15 * S(t * TAU * 3),
        lFwd: 0.3 * k,
        rFwd: 0.3 * k,
        lElbow: 0.3,
        rElbow: 0.3,
        headX: -0.2 * k,
        lift: 0.12 * b * k,
        lKnee: 0.25 * (1 - b) * k,
        rKnee: 0.25 * (1 - b) * k,
        lHip: 0.12 * (1 - b) * k,
        rHip: 0.12 * (1 - b) * k,
      });
    }
    case "shrug": {
      const cyc = (t % 1.6) / 1.6;
      const k = Math.sin(clamp(cyc / 0.6) * Math.PI);
      return P({
        lOut: 0.35 + 0.25 * k,
        rOut: 0.35 + 0.25 * k,
        lFwd: 0.3,
        rFwd: 0.3,
        lElbow: 1.2 + 0.25 * k,
        rElbow: 1.2 + 0.25 * k,
        bob: 0.04 * k,
        headZ: 0.18 * k,
        headX: -0.05 * k,
      });
    }
    case "think":
      return P({
        rFwd: 0.95,
        rOut: 0.2,
        rElbow: 2.35,
        lFwd: 0.55,
        lOut: -0.25,
        lElbow: 1.55,
        headZ: 0.14,
        headX: -0.12 + 0.03 * S(t * 1.3),
        bob: 0.01 * breathe,
      });
    case "scared": {
      const tr = S(t * TAU * 9) * 0.03;
      return P({
        lean: -0.08,
        lFwd: 1.15,
        rFwd: 1.15,
        lOut: 0.45,
        rOut: 0.45,
        lElbow: 1.65,
        rElbow: 1.65,
        lKnee: 0.3,
        rKnee: 0.3,
        lHip: 0.15,
        rHip: 0.15,
        bob: -0.05,
        headX: 0.05 + tr,
        rootZ: tr * 0.5,
      });
    }
    case "fall": {
      const k = easeInOut(clamp(t / 0.7));
      const flail = (1 - k) * S(t * TAU * 4);
      return P({
        rootX: -1.5 * k,
        bob: 0,
        lift: 0.24 * k,
        lOut: 0.6 + 0.6 * flail,
        rOut: 0.6 - 0.6 * flail,
        lFwd: 0.6 * k,
        rFwd: 0.6 * k,
        lHip: 0.3 * k,
        rHip: 0.1 * k,
        lKnee: 0.4 * k,
        headX: -0.3 * k,
      });
    }
    case "lie":
      return P({
        rootX: -1.5,
        lift: 0.24,
        lOut: 0.35,
        rOut: 0.35,
        lHip: 0.05,
        rHip: 0.05,
        lKnee: 0.1,
        bob: 0.01 * breathe,
      });
    case "sit":
      return P({
        bob: -0.5,
        lHip: 1.55,
        rHip: 1.55,
        lKnee: 1.55,
        rKnee: 1.55,
        lHipOut: 0.08,
        rHipOut: 0.08,
        lFwd: 0.55,
        rFwd: 0.55,
        lElbow: 0.7,
        rElbow: 0.7,
        lean: 0.05 + 0.01 * breathe,
      });
    case "jump": {
      const cyc = (t % 1.0) / 1.0;
      const air = cyc > 0.25 && cyc < 0.85 ? Math.sin(((cyc - 0.25) / 0.6) * Math.PI) : 0;
      const crouch = cyc <= 0.25 ? Math.sin((cyc / 0.25) * Math.PI) : cyc >= 0.85 ? Math.sin(((cyc - 0.85) / 0.15) * Math.PI) : 0;
      return P({
        lift: 0.9 * air,
        bob: -0.18 * crouch,
        lKnee: 0.9 * crouch + 0.4 * air,
        rKnee: 0.9 * crouch + 0.4 * air,
        lHip: 0.45 * crouch + 0.2 * air,
        rHip: 0.45 * crouch + 0.2 * air,
        lOut: 0.2 + 2.3 * air,
        rOut: 0.2 + 2.3 * air,
        lFwd: -0.4 * crouch,
        rFwd: -0.4 * crouch,
        lean: 0.2 * crouch,
      });
    }
    case "talk": {
      const g = S((t + seed) * TAU * 0.9);
      const g2 = S((t + seed) * TAU * 0.7 + 1.3);
      return P({
        rFwd: 0.55 + 0.25 * g,
        rOut: 0.25,
        rElbow: 1.25 + 0.3 * g2,
        lFwd: 0.4 + 0.2 * g2,
        lOut: 0.2,
        lElbow: 1.1 + 0.25 * g,
        headX: 0.05 * S((t + seed) * TAU * 1.3),
        headZ: 0.06 * g2,
        bob: 0.01 * breathe,
      });
    }
    case "facepalm": {
      const k = easeOut(clamp(t / 0.35));
      return P({
        rFwd: 1.25 * k,
        rOut: 0.1,
        rElbow: 2.45 * k,
        headX: 0.35 * k,
        lean: 0.08 * k,
        lElbow: 0.25,
        headZ: 0.05 * S(t * 2),
      });
    }
    case "dance": {
      const p = (t + seed * 0.2) * TAU * 1.9;
      return P({
        rootZ: 0.12 * S(p / 2),
        lOut: 1.4 + 1.0 * S(p),
        rOut: 1.4 - 1.0 * S(p),
        lElbow: 0.8 + 0.5 * Math.cos(p),
        rElbow: 0.8 - 0.5 * Math.cos(p),
        lKnee: 0.3 + 0.3 * Math.max(0, S(p)),
        rKnee: 0.3 + 0.3 * Math.max(0, -S(p)),
        lHip: 0.15,
        rHip: 0.15,
        bob: -0.06 + 0.05 * Math.abs(S(p)),
        headZ: 0.15 * S(p / 2),
      });
    }
    case "cry": {
      const sob = Math.abs(S(t * TAU * 2.5));
      return P({
        lFwd: 1.1,
        rFwd: 1.1,
        lOut: 0.05,
        rOut: 0.05,
        lElbow: 2.4,
        rElbow: 2.4,
        headX: 0.32,
        lean: 0.12,
        bob: -0.02 + 0.02 * sob,
      });
    }
    case "angry": {
      const tr = S(t * TAU * 7) * 0.02;
      return P({
        lOut: 0.35,
        rOut: 0.35,
        lFwd: -0.15,
        rFwd: -0.15,
        lElbow: 0.5,
        rElbow: 0.5,
        lean: 0.12,
        headX: 0.12 + tr,
        lHipOut: 0.12,
        rHipOut: 0.12,
        rootZ: tr,
      });
    }
    default:
      return REST;
  }
};

export const blendPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = { ...a };
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k], t);
  });
  return out;
};

export const ACTIONS: ActionName[] = [
  "idle",
  "walk",
  "run",
  "wave",
  "point",
  "cheer",
  "shrug",
  "think",
  "scared",
  "fall",
  "lie",
  "sit",
  "jump",
  "talk",
  "facepalm",
  "dance",
  "cry",
  "angry",
];
