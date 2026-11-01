import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { Theme } from "../theme";
import type { Actor, CameraSpec, Crowd, LocationName, Prop, Scene, Vec3 } from "../types";
import { clamp, deg, easeInOut, easeOut, hashStr, lerp, noise1, rng } from "../util";
import { actorStateAt, buildSegments } from "./actor";
import { fogFor, Location } from "./Locations";
import { PropView } from "./Props";
import { Stickman } from "./Stickman";

const SHOTS = {
  wide: { dist: 13, h: 3.4, look: 1.8 },
  medium: { dist: 6.8, h: 2.1, look: 1.5 },
  close: { dist: 3.3, h: 2.05, look: 1.95 },
  extreme: { dist: 1.95, h: 2.08, look: 2.05 },
};

const CameraRig: React.FC<{ pos: Vec3; look: Vec3; fov: number }> = ({ pos, look, fov }) => {
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);
  const cam = useMemo(() => {
    const c = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 400);
    (c as unknown as { manual: boolean }).manual = true;
    return c;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const aspect = size.width / Math.max(1, size.height);
  // в вертикальном кадре (Shorts) расширяем угол, иначе в кадр влезет полчеловека
  cam.fov = aspect < 1 ? fov * 1.65 : fov;
  cam.aspect = aspect;
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.lookAt(look[0], look[1], look[2]);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  useLayoutEffect(() => {
    set({ camera: cam });
  }, [cam, set]);
  return null;
};

// avoid — цвета одежды героев сцены: толпа их не носит, чтобы герой выделялся
export const crowdActors = (crowd: Crowd, theme: Theme, avoid: string[] = []): Actor[] => {
  const shirts = theme.shirts.filter((c) => !avoid.includes(c) && !(crowd.avoid ?? []).includes(c));
  const r = rng(crowd.seed ?? 7);
  const [x1, z1, x2, z2] = crowd.area;
  const out: Actor[] = [];
  let guard = 0;
  while (out.length < crowd.count && guard < crowd.count * 40) {
    guard++;
    const x = lerp(Math.min(x1, x2), Math.max(x1, x2), r());
    const z = lerp(Math.min(z1, z2), Math.max(z1, z2), r());
    if (out.some((a) => Math.hypot(a.x - x, a.z - z) < 0.95 * (crowd.scale ?? 1))) continue;
    const hr = r();
    out.push({
      id: `crowd-${out.length}`,
      x,
      z,
      shirt: shirts[Math.floor(r() * shirts.length)],
      hair: hr < 0.12 ? "puff" : hr < 0.2 ? "bob" : hr < 0.26 ? "cap" : "none",
      hairColor: ["#2bb3a3", "#3a2a20", "#f2b632", "#e86aa6"][Math.floor(r() * 4)],
      action: crowd.action ?? "idle",
      face: crowd.face ?? "neutral",
      facing: crowd.facing ?? (r() - 0.5) * 30,
      scale: (crowd.scale ?? 1) * (0.95 + r() * 0.1),
    });
  }
  return out;
};

const cameraFor = (spec: CameraSpec | undefined, actors: Actor[], len: number, t: number, segsFor: (a: Actor) => ReturnType<typeof buildSegments>) => {
  const shot = SHOTS[spec?.shot ?? "medium"];
  const u = easeInOut(clamp(t / Math.max(0.01, len)));
  let target: Vec3 = [0, 0, 0];
  if (Array.isArray(spec?.target)) {
    target = spec!.target as Vec3;
  } else if (typeof spec?.target === "string") {
    const a = actors.find((x) => x.id === spec!.target);
    if (a) {
      const st = actorStateAt(a, segsFor(a), t);
      target = [st.x, 0, st.z];
    }
  } else if (actors.length) {
    // по умолчанию — центр главных героев на старте сцены
    const main = actors.filter((a) => !a.id.startsWith("crowd-"));
    const list = main.length ? main : actors;
    target = [list.reduce((s, a) => s + a.x, 0) / list.length, 0, list.reduce((s, a) => s + a.z, 0) / list.length];
  }
  // рост героя в кадре: камера опускается и подъезжает к детям (scale < 1)
  let sc = 1;
  if (typeof spec?.target === "string") sc = actors.find((x) => x.id === spec!.target)?.scale ?? 1;
  else if (!Array.isArray(spec?.target) && actors.length) {
    const main = actors.filter((a) => !a.id.startsWith("crowd-"));
    if (main.length) sc = Math.max(...main.map((a) => a.scale ?? 1));
  }
  const k = { wide: 0, medium: 0.6, close: 1, extreme: 1 }[spec?.shot ?? "medium"];
  const f = lerp(1, sc, k);
  let dist = shot.dist * f;
  let h = shot.h * f + (spec?.height ?? 0);
  let yaw = deg(spec?.angle ?? 0);
  let lateral = 0;
  let lookY = shot.look * f;
  switch (spec?.move ?? "static") {
    case "dolly-in":
      dist *= lerp(1.12, 0.82, u);
      break;
    case "dolly-out":
      dist *= lerp(0.85, 1.15, u);
      break;
    case "pan-left":
      lateral = lerp(1.3, -1.3, u) * (dist / 6);
      break;
    case "pan-right":
      lateral = lerp(-1.3, 1.3, u) * (dist / 6);
      break;
    case "orbit":
      yaw += deg(lerp(-14, 14, u));
      break;
    case "push":
      dist *= lerp(1, 0.55, easeOut(clamp(t / Math.max(0.01, len))));
      break;
    case "rise":
      h += lerp(-0.6, 1.6, u);
      lookY += lerp(-0.1, 0.3, u);
      break;
    default:
      break;
  }
  const sx = Math.sin(yaw);
  const sz = Math.cos(yaw);
  // правый вектор камеры
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const shakeAmp = spec?.move === "shake" ? 0.07 * (dist / 6) : 0.006 * (dist / 6);
  const jx = noise1(t * (spec?.move === "shake" ? 9 : 0.8), 1) * shakeAmp;
  const jy = noise1(t * (spec?.move === "shake" ? 11 : 0.7), 5) * shakeAmp;
  const pos: Vec3 = [target[0] + sx * dist + rx * lateral + jx, target[1] + h + jy, target[2] + sz * dist + rz * lateral];
  const look: Vec3 = [target[0] + rx * lateral, target[1] + lookY + jy * 0.5, target[2] + rz * lateral];
  return { pos, look };
};

export type WorldInput = {
  location: LocationName;
  scene: Scene;
  actors: Actor[];
  props: Prop[];
  camera?: CameraSpec;
  bg?: string;
};

export const World: React.FC<{ input: WorldInput; theme: Theme; t: number; len: number }> = ({ input, theme, t, len }) => {
  const { location, scene, actors, props, camera, bg } = input;
  const segMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof buildSegments>>();
    actors.forEach((a) => m.set(a.id, buildSegments(a, len)));
    return m;
  }, [actors, len]);
  const segsFor = (a: Actor) => segMap.get(a.id) ?? buildSegments(a, len);
  const cam = cameraFor(camera, actors, len, t, segsFor);
  const [fogNear, fogFar] = fogFor(location);
  const skyColor = location === "studio" ? bg ?? scene.bg ?? theme.studio : theme.sky;

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[location === "studio" ? skyColor : theme.fog, fogNear, fogFar]} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, theme.hemi]} />
      <directionalLight position={[6, 12, 8]} intensity={theme.sunPower} color={theme.sun} />
      <directionalLight position={[-8, 5, -6]} intensity={theme.sunPower * 0.25} color="#d8e4ff" />
      <ambientLight intensity={theme.ambient} />
      <CameraRig pos={cam.pos} look={cam.look} fov={35} />
      <Location name={location} scene={scene} theme={theme} t={t} len={len} bg={bg} />
      {props.map((p, i) => (
        <PropView key={`p${i}`} prop={p} t={t} len={len} />
      ))}
      {actors.map((a, i) => (
        <Stickman
          key={a.id}
          actor={a}
          state={actorStateAt(a, segsFor(a), t)}
          defaultShirt={theme.shirts[(hashStr(a.id) + i) % theme.shirts.length]}
        />
      ))}
    </>
  );
};
