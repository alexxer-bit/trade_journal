import React, { useMemo } from "react";
import * as THREE from "three";
import { useCtx } from "../ctx";
import type { Theme } from "../theme";
import type { LocationName, Scene } from "../types";
import { rng } from "../util";
import { G, mat, shade } from "./geo";
import { Ball, Box, Cone, Cyl, Plane } from "./prims";
import { PropView, Screen } from "./Props";

// Трава в клетку, как на референсе
const gridCache = new Map<string, THREE.Texture>();
const gridTexture = (base: string, line: string) => {
  const key = base + line;
  let tex = gridCache.get(key);
  if (!tex) {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 256;
    const c = cv.getContext("2d")!;
    c.fillStyle = base;
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = line;
    c.fillRect(0, 0, 128, 128);
    c.fillRect(128, 128, 128, 128);
    tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60, 60);
    tex.magFilter = THREE.NearestFilter;
    gridCache.set(key, tex);
  }
  return tex;
};

const Ground: React.FC<{ color: string; grid?: string; size?: number }> = ({ color, grid, size = 120 }) => {
  const tex = useMemo(() => (grid ? gridTexture(color, grid) : null), [color, grid]);
  return (
    <mesh geometry={G.plane} rotation={[-Math.PI / 2, 0, 0]} scale={[size, size, 1]}>
      {tex ? <meshStandardMaterial map={tex} roughness={1} /> : <primitive object={mat(color)} attach="material" />}
    </mesh>
  );
};

const Building: React.FC<{ x: number; z: number; w: number; h: number; d?: number; color: string; theme: Theme; seed: number }> = ({
  x,
  z,
  w,
  h,
  d = 4,
  color,
  theme,
  seed,
}) => {
  const r = rng(seed);
  const cols = Math.max(1, Math.floor(w / 1.3));
  const rows = Math.max(1, Math.floor((h - 1.2) / 1.6));
  const win = theme.windowsLit ? mat(theme.windows, { emissive: true }) : mat(theme.windows, { rough: 0.3 });
  const windows: React.ReactNode[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (theme.windowsLit && r() < 0.3) continue;
      const wx = -w / 2 + (w / cols) * (i + 0.5);
      const wy = 1.9 + j * 1.6;
      windows.push(<mesh key={`${i}-${j}`} geometry={G.plane} material={win} position={[wx, wy, d / 2 + 0.01]} scale={[0.75, 0.95, 1]} />);
    }
  }
  return (
    <group position={[x, 0, z]}>
      <Box c={color} p={[0, h / 2, 0]} s={[w, h, d]} />
      <Box c={shade(color, -0.12)} p={[0, h + 0.1, 0]} s={[w + 0.2, 0.2, d + 0.2]} />
      {windows}
      {r() < 0.6 ? <Box c={shade(color, -0.25)} p={[(r() - 0.5) * (w - 1.2), 0.9, d / 2 + 0.02]} s={[0.9, 1.8, 0.05]} /> : null}
    </group>
  );
};

const Row: React.FC<{ z: number; from: number; to: number; theme: Theme; seed: number; minH?: number; maxH?: number }> = ({
  z,
  from,
  to,
  theme,
  seed,
  minH = 4,
  maxH = 9,
}) => {
  const r = rng(seed);
  const items: React.ReactNode[] = [];
  let x = from;
  let i = 0;
  while (x < to) {
    const w = 3 + r() * 2.5;
    const h = minH + r() * (maxH - minH);
    const color = theme.walls[Math.floor(r() * theme.walls.length)];
    items.push(<Building key={i} x={x + w / 2} z={z - r() * 0.8} w={w} h={h} color={color} theme={theme} seed={seed * 31 + i} />);
    x += w + 0.15;
    i++;
  }
  return <>{items}</>;
};

const Room: React.FC<{ wall: string; floor: string; w?: number; d?: number; h?: number; side?: string }> = ({ wall, floor, w = 16, d = 12, h = 6, side }) => (
  <group>
    <Box c={floor} p={[0, -0.05, -d / 2 + 4]} s={[w, 0.1, d]} />
    <Box c={wall} p={[0, h / 2, -d + 4]} s={[w, h, 0.2]} />
    <Box c={side ?? shade(wall, -0.05)} p={[-w / 2, h / 2, -d / 2 + 4]} s={[0.2, h, d]} />
    <Box c={side ?? shade(wall, -0.05)} p={[w / 2, h / 2, -d / 2 + 4]} s={[0.2, h, d]} />
    <Box c={shade(wall, -0.15)} p={[0, 0.12, -d + 4.12]} s={[w, 0.24, 0.05]} />
  </group>
);

const SceneScreen: React.FC<{ scene: Scene; t: number; len: number; p: [number, number, number]; w: number; h: number; fallback?: string[] }> = ({
  scene,
  t,
  len,
  p,
  w,
  h,
  fallback,
}) => {
  const { brandName } = useCtx();
  const spec = scene.screen;
  const lines = spec?.lines ?? fallback ?? (brandName ? [brandName] : [""]);
  return <Screen p={p} w={w} h={h} lines={lines} progress={spec?.progress} t={t} len={len} brand={spec?.brand ?? true} />;
};

export const Location: React.FC<{ name: LocationName; scene: Scene; theme: Theme; t: number; len: number; bg?: string }> = ({
  name,
  scene,
  theme,
  t,
  len,
  bg,
}) => {
  const seed = (scene.variant ?? 1) * 7919;
  switch (name) {
    case "street":
      return (
        <group>
          <Ground color={theme.sidewalk} />
          <Box c={theme.road} p={[0, 0.01, -5]} s={[120, 0.02, 4]} />
          {Array.from({ length: 16 }).map((_, i) => (
            <Box key={i} c="#f4f1e8" p={[-30 + i * 4, 0.025, -5]} s={[1.6, 0.01, 0.15]} />
          ))}
          <Box c={shade(theme.sidewalk, -0.06)} p={[0, 0.06, -2.95]} s={[120, 0.12, 0.15]} />
          <Row z={-10} from={-26} to={26} theme={theme} seed={seed} />
          {[-12, -4, 4, 12].map((x, i) => (
            <PropView key={i} prop={{ type: "lamp", x, z: -2.6 }} t={t} len={len} />
          ))}
          <PropView prop={{ type: "tree", x: -8, z: -2.2 }} t={t} len={len} />
          <PropView prop={{ type: "tree", x: 8.5, z: -2.3 }} t={t} len={len} />
        </group>
      );
    case "plaza":
      return (
        <group>
          <Ground color={theme.ground} grid={theme.groundLine} />
          <Row z={-14} from={-30} to={30} theme={theme} seed={seed} minH={5} maxH={11} />
          <Box c={theme.walls[1 % theme.walls.length]} p={[-11, 3, -6]} s={[5, 6, 5]} />
          <Box c={theme.walls[0]} p={[11, 3.5, -6]} s={[5, 7, 5]} />
          <Cyl c="#5b5f6b" p={[-2.4, 1.5, -8]} s={[0.12, 3.0, 0.12]} lo />
          <Cyl c="#5b5f6b" p={[2.4, 1.5, -8]} s={[0.12, 3.0, 0.12]} lo />
          <SceneScreen scene={scene} t={t} len={len} p={[0, 4.2, -8]} w={6.0} h={3.0} />
          <PropView prop={{ type: "tree", x: -7, z: -3 }} t={t} len={len} />
          <PropView prop={{ type: "tree", x: 7.5, z: -3.5 }} t={t} len={len} />
        </group>
      );
    case "cafe": {
      const glow = "#f7a64e";
      return (
        <group>
          <Room wall="#3a2f45" floor="#4a3d52" side="#33293d" />
          {[-5.4, -2.2, 3.4, 6.6].map((x, i) => (
            <group key={i}>
              <Plane c={glow} e p={[x, 2.6, -7.88]} s={[2.8, 4.2, 1]} />
              <Box c="#2a2133" p={[x, 2.6, -7.86]} s={[0.08, 4.2, 0.02]} />
              <Box c="#2a2133" p={[x, 2.4, -7.86]} s={[2.8, 0.08, 0.02]} />
            </group>
          ))}
          <Box c="#2bb3b1" p={[0.6, 1.4, -7.85]} s={[1.6, 2.8, 0.08]} />
          <Box c="#1f9c9a" p={[0.6, 3.1, -7.85]} s={[2.2, 0.5, 0.1]} />
          <PropView prop={{ type: "plant", x: -6.5, z: -6.5, scale: 1.6 }} t={t} len={len} />
          <PropView prop={{ type: "plant", x: 6.8, z: -6.4, scale: 1.4 }} t={t} len={len} />
          <PropView prop={{ type: "table", x: -4, z: -4.5, scale: 0.8 }} t={t} len={len} />
          <PropView prop={{ type: "table", x: 4.5, z: -4.8, scale: 0.8 }} t={t} len={len} />
          <pointLight position={[0, 3.5, -5]} intensity={18} distance={14} color={glow} />
        </group>
      );
    }
    case "lab":
      return (
        <group>
          <Room wall="#e6f1f4" floor="#cfd8de" side="#d8e6ea" />
          <SceneScreen scene={scene} t={t} len={len} p={[-1.8, 3.2, -7.8]} w={4.6} h={2.6} fallback={["ANALYZING", "..."]} />
          <Box c="#f2f4f6" p={[-1.2, 0.5, -5.6]} s={[7, 1, 1.4]} />
          <Box c="#c8d2d9" p={[-1.2, 1.02, -5.6]} s={[7.1, 0.05, 1.5]} />
          {[-4, -3.1, -2.2, -1.3, -0.4, 0.5].map((x, i) => (
            <group key={i} position={[x, 1.05, -5.3]}>
              <Cyl c="#ffffff" p={[0, 0.2, 0]} s={[0.17, 0.4, 0.17]} />
              <Cyl c="#e2483d" p={[0, 0.45, 0]} s={[0.18, 0.1, 0.18]} />
            </group>
          ))}
          <Box c="#ffffff" p={[4.5, 3.6, -7.75]} s={[3.4, 0.08, 0.6]} />
          {["#3fd0f0", "#f5c242", "#3fd0d4", "#b46ce8"].map((col, i) => (
            <Ball key={i} c={col} e p={[3.3 + i * 0.8, 3.9, -7.6]} s={0.26} />
          ))}
          <Ball c="#c0392b" e p={[2.2, 4.6, -7.7]} s={0.28} />
          <Box c="#dfe7ec" p={[6, 1.2, -6]} s={[1.6, 2.4, 1.4]} />
        </group>
      );
    case "room":
      return (
        <group>
          <Room wall={theme.interiorWall} floor={theme.interiorFloor} />
          <group position={[3.5, 3.0, -7.85]}>
            <Box c="#ffffff" s={[3.2, 2.4, 0.1]} />
            <Plane c={theme.sky} e p={[0, 0, 0.06]} s={[2.9, 2.1, 1]} />
            <Box c="#ffffff" p={[0, 0, 0.07]} s={[0.08, 2.1, 0.02]} />
          </group>
          <group position={[-3.5, 0, -6.6]}>
            <Box c="#5e7bd6" p={[0, 0.45, 0]} s={[3.4, 0.6, 1.2]} />
            <Box c="#5470c9" p={[0, 1.0, -0.5]} s={[3.4, 0.9, 0.3]} />
            <Box c="#5470c9" p={[-1.6, 0.75, 0]} s={[0.3, 0.6, 1.2]} />
            <Box c="#5470c9" p={[1.6, 0.75, 0]} s={[0.3, 0.6, 1.2]} />
          </group>
          <Box c={shade(theme.interiorFloor, 0.08)} p={[0, 0.005, -3.5]} s={[6, 0.01, 3.5]} />
          <PropView prop={{ type: "plant", x: 6.5, z: -7, scale: 1.4 }} t={t} len={len} />
          <PropView prop={{ type: "lamp", x: -6.5, z: -7, scale: 0.55 }} t={t} len={len} />
          <Box c="#f2c230" p={[-3.5, 3.4, -7.85]} s={[1.6, 1.1, 0.06]} />
        </group>
      );
    case "office":
      return (
        <group>
          <Room wall="#cfd9e6" floor="#9aa3b0" side="#c3cedc" />
          <SceneScreen scene={scene} t={t} len={len} p={[0, 3.3, -7.8]} w={4.4} h={2.4} />
          {[-4.5, 0, 4.5].map((x, i) => (
            <group key={i} position={[x, 0, -4.8]}>
              <Box c="#f3f3f3" p={[0, 0.75, 0]} s={[2.4, 0.08, 1.1]} />
              <Box c="#8a93a3" p={[-1.1, 0.37, 0]} s={[0.06, 0.74, 1.0]} />
              <Box c="#8a93a3" p={[1.1, 0.37, 0]} s={[0.06, 0.74, 1.0]} />
              <Box c="#2a2f3d" p={[0, 1.25, -0.3]} s={[1.0, 0.65, 0.05]} />
              <Plane c="#7fb8ff" e p={[0, 1.25, -0.27]} s={[0.92, 0.57, 1]} />
            </group>
          ))}
          <PropView prop={{ type: "plant", x: -7, z: -7, scale: 1.5 }} t={t} len={len} />
        </group>
      );
    case "park": {
      const r = rng(seed);
      return (
        <group>
          <Ground color={theme.ground} grid={theme.groundLine} />
          <Box c={theme.sidewalk} p={[0, 0.015, -1.5]} s={[120, 0.02, 2.2]} />
          {Array.from({ length: 9 }).map((_, i) => (
            <PropView key={i} prop={{ type: "tree", x: -22 + i * 5.5 + r() * 2, z: -7 - r() * 6, scale: 1 + r() * 0.6 }} t={t} len={len} />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <group key={`c${i}`} position={[-15 + i * 10 + r() * 3, 0, -16 - r() * 4]}>
              <Cone c={shade(theme.leaf, -0.08)} p={[0, 2, 0]} s={[1.3, 4, 1.3]} />
            </group>
          ))}
          <Ball c={shade(theme.ground, 0.05)} p={[-14, -4, -30]} s={[18, 9, 8]} lo />
          <Ball c={shade(theme.ground, 0.08)} p={[14, -5, -32]} s={[20, 10, 8]} lo />
          <PropView prop={{ type: "bench", x: 5, z: -3.4 }} t={t} len={len} />
          <PropView prop={{ type: "lamp", x: -5, z: -3.2 }} t={t} len={len} />
        </group>
      );
    }
    case "stage":
      return (
        <group>
          <Box c="#a9753f" p={[0, -0.05, -2]} s={[18, 0.1, 12]} />
          <Box c="#2a1f2a" p={[0, 4, -8]} s={[18, 8, 0.2]} />
          {Array.from({ length: 12 }).map((_, i) => (
            <Cyl key={i} c={i % 2 ? "#b8283a" : "#a52233"} p={[-8.25 + i * 1.5, 3.6, -7.6]} s={[0.55, 7.2, 0.35]} lo />
          ))}
          <SceneScreen scene={scene} t={t} len={len} p={[0, 6.6, -7.4]} w={5} h={1.4} />
          <mesh geometry={G.circle} material={mat("#fff6d8", { emissive: true, opacity: 0.35 })} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[2.6, 2.6, 1]} />
          <Cyl c="#3d4150" p={[1.6, 0.7, 0.4]} s={[0.03, 1.4, 0.03]} lo />
          <Ball c="#2a2a2a" p={[1.6, 1.45, 0.4]} s={0.08} />
          <pointLight position={[0, 6, 3]} intensity={25} distance={20} color="#fff2d0" />
        </group>
      );
    case "hospital":
      return (
        <group>
          <Room wall="#d7efe6" floor="#e8ecef" side="#cbe5db" />
          <PropView prop={{ type: "bed", x: -2.5, z: -5.2 }} t={t} len={len} />
          <SceneScreen scene={scene} t={t} len={len} p={[2.6, 2.5, -7.8]} w={3.2} h={1.8} fallback={["PULSE", "72 BPM"]} />
          <Cyl c="#c5ccd6" p={[-0.4, 1.1, -5.8]} s={[0.03, 2.2, 0.03]} lo />
          <Box c="#bfe6ff" p={[-0.4, 2.0, -5.8]} s={[0.25, 0.4, 0.1]} o={0.8} />
          <Box c="#9fd8cf" p={[5.5, 2.4, -6.6]} s={[0.1, 4.8, 3]} />
          <PropView prop={{ type: "door", x: 6.5, z: -7.85 }} t={t} len={len} />
        </group>
      );
    case "studio":
    default: {
      const c = bg ?? scene.bg ?? theme.studio;
      return (
        <group>
          <Box c={c} p={[0, -0.05, -6]} s={[60, 0.1, 40]} />
          <Box c={shade(c, 0.03)} p={[0, 15, -20]} s={[60, 30, 0.2]} />
          <mesh geometry={G.circle} material={mat(shade(c, 0.06), { emissive: true, opacity: 0.6 })} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} scale={[3, 3, 1]} />
        </group>
      );
    }
  }
};

export const fogFor = (name: LocationName): [number, number] => {
  if (name === "street" || name === "plaza" || name === "park") return [18, 70];
  return [30, 90];
};
