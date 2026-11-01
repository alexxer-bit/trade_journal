import type { ActionName, Actor, FaceName, Facing, Vec2 } from "../types";
import { clamp, hashStr, lerp, lerpAngle } from "../util";
import { blendPose, MOVE_SPEED, poseFor, type Pose } from "./poses";

export const facingToYaw = (f: Facing | undefined): number => {
  if (f === undefined || f === "camera") return 0;
  if (f === "left") return -Math.PI / 2;
  if (f === "right") return Math.PI / 2;
  if (f === "away") return Math.PI;
  return (f * Math.PI) / 180;
};

type Segment = {
  start: number;
  end: number;
  action: ActionName;
  face: FaceName;
  talking: boolean;
  yaw: number;
  from: Vec2;
  to: Vec2;
  moveEnd: number; // когда дошёл (== start, если стоит)
};

const isMoving = (a: ActionName) => a === "walk" || a === "run";

export const buildSegments = (actor: Actor, sceneLen: number): Segment[] => {
  const first = {
    at: 0,
    action: actor.action ?? (actor.to ? "walk" : "idle"),
    face: actor.face ?? "neutral",
    facing: actor.facing,
    to: actor.to,
    talking: actor.talking ?? false,
  };
  const beats = [first, ...(actor.beats ?? []).slice().sort((a, b) => a.at - b.at)];
  const segs: Segment[] = [];
  let pos: Vec2 = [actor.x, actor.z];
  let yaw = facingToYaw(actor.facing);
  let action: ActionName = first.action as ActionName;
  let face: FaceName = first.face as FaceName;
  let talking = first.talking;

  beats.forEach((b, i) => {
    const start = Math.max(0, b.at);
    const end = i + 1 < beats.length ? Math.max(start, beats[i + 1].at) : Math.max(start, sceneLen);
    if (b.action) action = b.action;
    if (b.face) face = b.face;
    if (b.talking !== undefined) talking = b.talking;
    const explicitYaw = b.facing !== undefined ? facingToYaw(b.facing) : null;

    if (b.to) {
      const act: ActionName = isMoving(action) || action === "dance" ? action : "walk";
      const speed = MOVE_SPEED[act] || 1.5;
      const dx = b.to[0] - pos[0];
      const dz = b.to[1] - pos[1];
      const dist = Math.hypot(dx, dz);
      const moveYaw = dist > 0.01 ? Math.atan2(dx, dz) : yaw;
      const arrive = start + dist / speed;
      const moveEnd = Math.min(arrive, end);
      const k = arrive > start ? (moveEnd - start) / (arrive - start) : 1;
      const reached: Vec2 = [lerp(pos[0], b.to[0], k), lerp(pos[1], b.to[1], k)];
      segs.push({ start, end: moveEnd, action: act, face, talking, yaw: moveYaw, from: pos, to: reached, moveEnd });
      if (moveEnd < end) {
        const after: ActionName = isMoving(action) ? "idle" : action;
        segs.push({
          start: moveEnd,
          end,
          action: after,
          face,
          talking,
          yaw: explicitYaw ?? moveYaw,
          from: reached,
          to: reached,
          moveEnd,
        });
      }
      pos = reached;
      yaw = explicitYaw ?? moveYaw;
    } else {
      if (explicitYaw !== null) yaw = explicitYaw;
      segs.push({ start, end, action, face, talking, yaw, from: pos, to: pos, moveEnd: start });
    }
  });
  return segs;
};

export type ActorState = {
  x: number;
  z: number;
  yaw: number;
  pose: Pose;
  face: FaceName;
  talking: boolean;
  t: number;
};

const BLEND = 0.25;

export const actorStateAt = (actor: Actor, segs: Segment[], t: number): ActorState => {
  const seed = (hashStr(actor.id) % 1000) / 137;
  let idx = segs.findIndex((s) => t >= s.start && t < s.end);
  if (idx === -1) idx = t < (segs[0]?.start ?? 0) ? 0 : segs.length - 1;
  const s = segs[idx];
  const local = t - s.start;
  const mk = s.moveEnd > s.start ? clamp((t - s.start) / (s.moveEnd - s.start)) : 1;
  const x = lerp(s.from[0], s.to[0], mk);
  const z = lerp(s.from[1], s.to[1], mk);

  let pose = poseFor(s.action, local, seed);
  let yaw = s.yaw;
  const prev = segs[idx - 1];
  if (prev && local < BLEND) {
    const k = local / BLEND;
    const prevPose = poseFor(prev.action, t - prev.start, seed);
    pose = blendPose(prevPose, pose, k);
    yaw = lerpAngle(prev.yaw, s.yaw, k);
  }
  return { x, z, yaw, pose, face: s.face, talking: s.talking, t };
};

// Позиция актёра на момент времени — нужна камере, чтобы следить за ним
export const actorPosAt = (actor: Actor, sceneLen: number, t: number): Vec2 => {
  const st = actorStateAt(actor, buildSegments(actor, sceneLen), t);
  return [st.x, st.z];
};
