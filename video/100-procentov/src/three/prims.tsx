import React from "react";
import type * as THREE from "three";
import { G, mat } from "./geo";

type V3 = [number, number, number];
type Common = { p?: V3; s?: V3 | number; r?: V3; c: string; e?: boolean; o?: number; rough?: number };

const m = (c: string, e?: boolean, o?: number, rough?: number) => mat(c, { emissive: e, opacity: o, rough });

export const Box: React.FC<Common> = ({ p, s, r, c, e, o, rough }) => (
  <mesh geometry={G.box} material={m(c, e, o, rough)} position={p} scale={s} rotation={r} />
);
export const Ball: React.FC<Common & { lo?: boolean }> = ({ p, s, r, c, e, o, lo, rough }) => (
  <mesh geometry={lo ? G.sphereLo : G.sphere} material={m(c, e, o, rough)} position={p} scale={s} rotation={r} />
);
export const Cyl: React.FC<Common & { lo?: boolean }> = ({ p, s, r, c, e, o, lo, rough }) => (
  <mesh geometry={lo ? G.cylLo : G.cyl} material={m(c, e, o, rough)} position={p} scale={s} rotation={r} />
);
export const Cone: React.FC<Common> = ({ p, s, r, c, e, o }) => (
  <mesh geometry={G.cone} material={m(c, e, o)} position={p} scale={s} rotation={r} />
);
export const Plane: React.FC<Common> = ({ p, s, r, c, e, o }) => (
  <mesh geometry={G.plane} material={m(c, e, o)} position={p} scale={s} rotation={r} />
);
export const TexPlane: React.FC<{ p?: V3; s?: V3; r?: V3; tex: THREE.Texture }> = ({ p, s, r, tex }) => (
  <mesh geometry={G.plane} position={p} scale={s} rotation={r}>
    <meshBasicMaterial map={tex} toneMapped={false} transparent />
  </mesh>
);
export const Shadow: React.FC<{ p: V3; s: [number, number] }> = ({ p, s }) => (
  <mesh geometry={G.circle} material={mat("#000000", { emissive: true, opacity: 0.14 })} rotation={[-Math.PI / 2, 0, 0]} position={p} scale={[s[0], s[1], 1]} />
);
