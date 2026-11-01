import React, { useMemo } from "react";
import * as THREE from "three";
import { useCtx } from "../ctx";
import { BLACK, WHITE } from "../theme";
import type { Actor, FaceName, HairName, HeldName } from "../types";
import { hashStr } from "../util";
import { G, mat, shade, shadowMat } from "./geo";
import type { ActorState } from "./actor";
import { useDinoTexture, useLabelTexture } from "./textures";

// Размеры персонажа (единицы ≈ метры). Ступни на y = 0, макушка ≈ 2.45.
const R_HEAD = 0.34;
const HIP_Y = 1.04;

const GEO = {
  torso: new THREE.CapsuleGeometry(0.24, 0.34, 8, 24),
  upperArm: new THREE.CapsuleGeometry(0.045, 0.3, 6, 12),
  foreArm: new THREE.CapsuleGeometry(0.045, 0.3, 6, 12),
  sleeve: new THREE.CapsuleGeometry(0.065, 0.28, 6, 12),
  thigh: new THREE.CapsuleGeometry(0.055, 0.4, 6, 12),
  shin: new THREE.CapsuleGeometry(0.055, 0.4, 6, 12),
  pantLeg: new THREE.CapsuleGeometry(0.07, 0.38, 6, 12),
  // кусок цилиндра чуть больше торса — на нём лежит принт
  print: new THREE.CylinderGeometry(0.248, 0.248, 0.46, 20, 1, true, -0.95, 1.9),
  bobCap: new THREE.SphereGeometry(R_HEAD + 0.035, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
};

// Точка на поверхности головы: возвращает позицию и поворот «лицом наружу»
const onHead = (x: number, y: number): { position: [number, number, number]; rotation: [number, number, number] } => {
  const z = Math.sqrt(Math.max(0.0001, R_HEAD * R_HEAD - x * x - y * y));
  return { position: [x, y, z - 0.004], rotation: [-Math.asin(y / R_HEAD), Math.atan2(x, z), 0] };
};

const white = () => mat(WHITE, { emissive: true });

const Feature: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => {
  const p = onHead(x, y);
  return (
    <group position={p.position} rotation={p.rotation}>
      {children}
    </group>
  );
};

const Face: React.FC<{ face: FaceName; talking: boolean; t: number; seed: number }> = ({ face, talking, t, seed }) => {
  // моргание
  const period = 3.2 + (seed % 13) / 10;
  const ph = (t + seed) % period;
  const blink = ph < 0.13 ? 0.12 : 1;
  const big = face === "scared" || face === "surprised" ? 1.3 : 1;
  const eyeY = face === "sleepy" ? 0.18 : blink;
  const eyeScale: [number, number, number] = [0.05 * big, 0.068 * big * eyeY, 0.02];

  const brows = (() => {
    switch (face) {
      case "sad":
      case "worried":
        return { y: 0.17, l: -0.35, r: 0.35 };
      case "angry":
        return { y: 0.15, l: 0.4, r: -0.4 };
      case "scared":
      case "surprised":
        return { y: 0.2, l: 0, r: 0 };
      default:
        return null;
    }
  })();

  let mouth: React.ReactNode;
  if (talking) {
    const open = Math.abs(Math.sin((t + seed) * 11)) * (0.6 + 0.4 * Math.sin((t + seed) * 3.7));
    mouth = (
      <mesh geometry={G.circle} material={white()} scale={[0.065, 0.02 + 0.045 * open, 1]} />
    );
  } else {
    switch (face) {
      case "happy":
        mouth = <mesh geometry={G.arc} material={white()} rotation={[0, 0, Math.PI]} scale={[0.08, 0.07, 0.04]} position={[0, 0.03, 0]} />;
        break;
      case "grin":
        mouth = <mesh geometry={G.halfDisc} material={white()} scale={[0.11, 0.09, 1]} position={[0, 0.02, 0]} />;
        break;
      case "sad":
        mouth = <mesh geometry={G.arc} material={white()} scale={[0.07, 0.05, 0.04]} position={[0, -0.04, 0]} />;
        break;
      case "scared":
        mouth = <mesh geometry={G.ring} material={white()} scale={[0.035, 0.045, 0.04]} />;
        break;
      case "surprised":
        mouth = <mesh geometry={G.ring} material={white()} scale={[0.05, 0.06, 0.04]} />;
        break;
      case "smirk":
        mouth = (
          <mesh geometry={G.arc} material={white()} rotation={[0, 0, Math.PI + 0.45]} scale={[0.06, 0.05, 0.04]} position={[0.03, 0.02, 0]} />
        );
        break;
      case "angry":
        mouth = <mesh geometry={G.box} material={white()} scale={[0.12, 0.022, 0.01]} rotation={[0, 0, 0]} position={[0, -0.01, 0]} />;
        break;
      case "worried":
        mouth = <mesh geometry={G.box} material={white()} scale={[0.1, 0.02, 0.01]} rotation={[0, 0, 0.18]} />;
        break;
      case "sleepy":
        mouth = <mesh geometry={G.box} material={white()} scale={[0.07, 0.02, 0.01]} />;
        break;
      default:
        mouth = <mesh geometry={G.box} material={white()} scale={[0.12, 0.022, 0.01]} />;
    }
  }

  return (
    <group>
      <Feature x={0.115} y={0.06}>
        <mesh geometry={G.sphere} material={white()} scale={eyeScale} />
      </Feature>
      <Feature x={-0.115} y={0.06}>
        <mesh geometry={G.sphere} material={white()} scale={eyeScale} />
      </Feature>
      {brows ? (
        <>
          <Feature x={0.12} y={brows.y}>
            <mesh geometry={G.box} material={white()} scale={[0.1, 0.02, 0.01]} rotation={[0, 0, brows.l]} />
          </Feature>
          <Feature x={-0.12} y={brows.y}>
            <mesh geometry={G.box} material={white()} scale={[0.1, 0.02, 0.01]} rotation={[0, 0, brows.r]} />
          </Feature>
        </>
      ) : null}
      <Feature x={0} y={-0.11}>
        {mouth}
      </Feature>
    </group>
  );
};

const Hair: React.FC<{ hair: HairName; color: string }> = ({ hair, color }) => {
  const m = mat(color);
  switch (hair) {
    case "puff":
      return (
        <group>
          {[
            [0, 0.3, -0.02, 0.17],
            [0.16, 0.24, -0.06, 0.14],
            [-0.16, 0.24, -0.06, 0.14],
            [0.08, 0.26, -0.18, 0.15],
            [-0.08, 0.26, -0.18, 0.15],
            [0, 0.18, -0.26, 0.15],
          ].map(([x, y, z, r], i) => (
            <mesh key={i} geometry={G.sphere} material={m} position={[x, y, z]} scale={r} />
          ))}
        </group>
      );
    case "bob":
      return <mesh geometry={GEO.bobCap} material={m} rotation={[-0.55, 0, 0]} position={[0, 0.02, -0.02]} />;
    case "bun":
      return (
        <group>
          <mesh geometry={GEO.bobCap} material={m} rotation={[-0.75, 0, 0]} position={[0, 0.0, -0.02]} />
          <mesh geometry={G.sphere} material={m} position={[0, 0.3, -0.2]} scale={0.13} />
        </group>
      );
    case "cap":
      return (
        <group position={[0, 0.2, 0]}>
          <mesh geometry={G.sphere} material={m} scale={[0.355, 0.2, 0.355]} />
          <mesh geometry={G.cyl} material={m} position={[0, -0.02, 0.28]} scale={[0.2, 0.03, 0.18]} />
        </group>
      );
    case "headband":
      return <mesh geometry={G.ring} material={mat(color, { emissive: true })} rotation={[Math.PI / 2 - 0.15, 0, 0]} position={[0, 0.14, 0]} scale={[0.33, 0.33, 0.12]} />;
    default:
      return null;
  }
};

const Held: React.FC<{ held: HeldName; text?: string }> = ({ held, text }) => {
  const { brandColor, brandName } = useCtx();
  const signTex = useLabelTexture(text ?? brandName ?? "", "#ffffff", 1.55, BLACK);
  switch (held) {
    case "phone":
      return (
        <group position={[0, -0.1, 0.06]} rotation={[0.5, 0, 0]}>
          <mesh geometry={G.box} material={mat("#22252e")} scale={[0.12, 0.22, 0.02]} />
          <mesh geometry={G.plane} material={mat("#7fd3ff", { emissive: true })} position={[0, 0, 0.011]} scale={[0.1, 0.19, 1]} />
        </group>
      );
    case "bottle":
      return (
        <group position={[0, -0.05, 0.05]}>
          <mesh geometry={G.cyl} material={mat(brandColor)} scale={[0.06, 0.22, 0.06]} />
          <mesh geometry={G.cyl} material={mat("#9aa0aa")} position={[0, 0.13, 0]} scale={[0.04, 0.05, 0.04]} />
        </group>
      );
    case "sign":
      return (
        <group position={[0, 0.2, 0.05]}>
          <mesh geometry={G.cyl} material={mat("#a87b52")} scale={[0.02, 0.9, 0.02]} />
          <group position={[0, 0.55, 0]}>
            <mesh geometry={G.box} material={mat("#f4f1ea")} scale={[0.72, 0.46, 0.03]} />
            <mesh position={[0, 0, 0.017]} scale={[0.68, 0.43, 1]} geometry={G.plane}>
              <meshBasicMaterial map={signTex} toneMapped={false} />
            </mesh>
          </group>
        </group>
      );
    case "cup":
      return <mesh geometry={G.cyl} material={mat("#ffffff")} position={[0, -0.04, 0.06]} scale={[0.06, 0.12, 0.06]} />;
    case "coin":
      return <mesh geometry={G.cyl} material={mat("#f2c230", { rough: 0.4 })} position={[0, -0.05, 0.06]} rotation={[Math.PI / 2, 0, 0]} scale={[0.1, 0.02, 0.1]} />;
    case "book":
      return <mesh geometry={G.box} material={mat("#c0453a")} position={[0, -0.08, 0.07]} scale={[0.25, 0.32, 0.06]} />;
    default:
      return null;
  }
};

const ShirtPrint: React.FC = () => {
  const tex = useDinoTexture();
  return (
    <mesh geometry={GEO.print} position={[0, 0.4, 0]}>
      <meshStandardMaterial map={tex} transparent alphaTest={0.05} roughness={0.8} />
    </mesh>
  );
};

export const Stickman: React.FC<{ actor: Actor; state: ActorState; defaultShirt: string }> = ({ actor, state, defaultShirt }) => {
  const seed = useMemo(() => (hashStr(actor.id) % 1000) / 97, [actor.id]);
  const p = state.pose;
  const shirt = actor.shirt ?? defaultShirt;
  const shirtM = mat(shirt);
  const sleeveM = mat(shade(shirt, -0.03));
  const black = mat(BLACK, { rough: 0.6 });
  const pantsM = actor.pants ? mat(actor.pants) : null;
  const longSleeves = (actor.sleeves ?? "long") === "long";
  const lying = Math.abs(p.rootX) > 1;

  const arm = (side: 1 | -1) => {
    const fwd = side === 1 ? p.lFwd : p.rFwd;
    const out = side === 1 ? p.lOut : p.rOut;
    const elbow = side === 1 ? p.lElbow : p.rElbow;
    return (
      <group position={[0.25 * side, 0.6, 0]} rotation={[-fwd, 0, out * side]}>
        <mesh geometry={GEO.upperArm} material={black} position={[0, -0.19, 0]} />
        <mesh geometry={GEO.sleeve} material={sleeveM} position={[0, -0.17, 0]} />
        <group position={[0, -0.38, 0]} rotation={[-elbow, 0, 0]}>
          <mesh geometry={GEO.foreArm} material={black} position={[0, -0.19, 0]} />
          {longSleeves ? <mesh geometry={GEO.sleeve} material={sleeveM} position={[0, -0.14, 0]} scale={[1, 0.8, 1]} /> : null}
          <mesh geometry={G.sphere} material={black} position={[0, -0.4, 0]} scale={0.065} />
          {side === -1 && actor.held && actor.held !== "none" ? (
            <group position={[0, -0.42, 0]}>
              <Held held={actor.held} text={actor.heldText} />
            </group>
          ) : null}
        </group>
      </group>
    );
  };

  const leg = (side: 1 | -1) => {
    const hip = side === 1 ? p.lHip : p.rHip;
    const hipOut = side === 1 ? p.lHipOut : p.rHipOut;
    const knee = side === 1 ? p.lKnee : p.rKnee;
    return (
      <group position={[0.11 * side, 0.02, 0]} rotation={[-hip, 0, hipOut * side]}>
        <mesh geometry={pantsM ? GEO.pantLeg : GEO.thigh} material={pantsM ?? black} position={[0, -0.25, 0]} />
        <group position={[0, -0.5, 0]} rotation={[knee, 0, 0]}>
          <mesh geometry={pantsM ? GEO.pantLeg : GEO.shin} material={pantsM ?? black} position={[0, -0.25, 0]} />
          <mesh geometry={G.sphere} material={black} position={[0, -0.5, 0.05]} scale={[0.075, 0.05, 0.13]} />
        </group>
      </group>
    );
  };

  return (
    <group position={[state.x, 0, state.z]} rotation={[0, state.yaw, 0]} scale={actor.scale ?? 1}>
      <mesh geometry={G.circle} material={shadowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, lying ? -1.0 : 0]} scale={lying ? [0.55, 1.2, 1] : [0.45, 0.45, 1]} />
      <group position={[0, p.lift, 0]} rotation={[p.rootX, 0, p.rootZ]}>
        <group position={[0, HIP_Y + p.bob, 0]} rotation={[0, p.twist, 0]}>
          {leg(1)}
          {leg(-1)}
          <group rotation={[p.lean, 0, 0]}>
            <mesh geometry={GEO.torso} material={shirtM} position={[0, 0.37, 0]} />
            {actor.print === "dino" ? <ShirtPrint /> : null}
            {arm(1)}
            {arm(-1)}
            <group position={[0, 1.08, 0]} rotation={[p.headX, p.headY, p.headZ]}>
              <mesh geometry={G.sphere} material={mat(BLACK, { rough: 0.55 })} scale={R_HEAD} />
              <Face face={state.face} talking={state.talking} t={state.t} seed={seed} />
              <Hair hair={actor.hair ?? "none"} color={actor.hairColor ?? "#2bb3a3"} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
