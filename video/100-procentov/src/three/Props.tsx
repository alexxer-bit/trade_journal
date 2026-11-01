import React from "react";
import { useCtx } from "../ctx";
import { BLACK } from "../theme";
import type { Prop } from "../types";
import { clamp, deg, easeInOut, lerp } from "../util";
import { shade } from "./geo";
import { Ball, Box, Cyl, Plane, Shadow, TexPlane } from "./prims";
import { useLabelTexture, useScreenTexture } from "./textures";

export const BrandLabel: React.FC<{ p: [number, number, number]; w: number; text?: string; r?: [number, number, number] }> = ({ p, w, text, r }) => {
  const { brandColor, brandName } = useCtx();
  const tex = useLabelTexture(text ?? brandName, brandColor, 3, "#ffffff", true);
  return <TexPlane tex={tex} p={p} s={[w, w / 3, 1]} r={r} />;
};

export const Screen: React.FC<{
  p: [number, number, number];
  w: number;
  h: number;
  lines: string[];
  progress?: Prop["progress"];
  t: number;
  len: number;
  brand?: boolean;
  r?: [number, number, number];
  frame?: string;
}> = ({ p, w, h, lines, progress, t, len, brand, r, frame }) => {
  const { brandColor, brandName } = useCtx();
  const v = progress ? lerp(progress.from, progress.to, easeInOut(clamp(t / Math.max(0.5, len * 0.85)))) : undefined;
  const tex = useScreenTexture(w / h, {
    lines,
    progress,
    progressValue: v,
    brand: brand ? { name: brandName, color: brandColor } : null,
    accent: brandColor,
  });
  return (
    <group position={p} rotation={r}>
      <Box c={frame ?? "#2a2f3d"} s={[w + 0.16, h + 0.16, 0.12]} p={[0, 0, -0.07]} />
      <TexPlane tex={tex} s={[w, h, 1]} />
    </group>
  );
};

export const PropView: React.FC<{ prop: Prop; t: number; len: number }> = ({ prop, t, len }) => {
  const { theme, brandColor } = useCtx();
  const c = prop.color;
  const inner = (() => {
    switch (prop.type) {
      case "bottle":
        return (
          <group>
            <Shadow p={[0, 0.01, 0]} s={[0.55, 0.55]} />
            <Cyl c={c ?? "#5fd0e3"} p={[0, 0.65, 0]} s={[0.36, 1.3, 0.36]} o={0.92} rough={0.3} />
            <Cyl c={shade(c ?? "#5fd0e3", 0.15)} p={[-0.18, 0.7, 0.22]} s={[0.04, 1.0, 0.04]} o={0.7} e />
            <Cyl c="#cfd3da" p={[0, 1.38, 0]} s={[0.2, 0.16, 0.2]} />
            <Cyl c="#9aa0aa" p={[0, 1.52, 0]} s={[0.24, 0.14, 0.24]} />
            <BrandLabel p={[0, 0.7, 0.365]} w={0.62} text={prop.label} />
          </group>
        );
      case "syringe":
        return (
          <group rotation={[0, 0, deg(-20)]}>
            <Cyl c="#bfefff" p={[0, 1.2, 0]} s={[0.12, 1.0, 0.12]} r={[0, 0, Math.PI / 2]} o={0.85} />
            <Cyl c={brandColor} p={[0.1, 1.2, 0]} s={[0.09, 0.6, 0.09]} r={[0, 0, Math.PI / 2]} e />
            <Box c="#e9eef3" p={[0.62, 1.2, 0]} s={[0.24, 0.05, 0.4]} />
            <Cyl c="#d9dee5" p={[0.82, 1.2, 0]} s={[0.04, 0.4, 0.04]} r={[0, 0, Math.PI / 2]} />
            <Cyl c="#cfd5dc" p={[-0.7, 1.2, 0]} s={[0.012, 0.5, 0.012]} r={[0, 0, Math.PI / 2]} />
          </group>
        );
      case "table":
        return (
          <group>
            <Shadow p={[0, 0.01, 0]} s={[1.0, 0.65]} />
            <Box c={c ?? theme.wood} p={[0, 0.76, 0]} s={[1.6, 0.08, 0.9]} />
            {[
              [-0.7, -0.35],
              [0.7, -0.35],
              [-0.7, 0.35],
              [0.7, 0.35],
            ].map(([x, z], i) => (
              <Cyl key={i} c={shade(c ?? theme.wood, -0.12)} p={[x, 0.37, z]} s={[0.04, 0.74, 0.04]} lo />
            ))}
          </group>
        );
      case "chair":
        return (
          <group>
            <Box c={c ?? "#e07b54"} p={[0, 0.5, 0]} s={[0.55, 0.07, 0.55]} />
            <Box c={c ?? "#e07b54"} p={[0, 0.85, -0.25]} s={[0.55, 0.65, 0.07]} />
            {[
              [-0.23, -0.23],
              [0.23, -0.23],
              [-0.23, 0.23],
              [0.23, 0.23],
            ].map(([x, z], i) => (
              <Cyl key={i} c="#3a3a44" p={[x, 0.25, z]} s={[0.025, 0.5, 0.025]} lo />
            ))}
          </group>
        );
      case "tree":
        return (
          <group>
            <Shadow p={[0, 0.01, 0]} s={[1.0, 1.0]} />
            <Cyl c="#8a6244" p={[0, 0.8, 0]} s={[0.14, 1.6, 0.14]} lo />
            <Ball c={c ?? theme.leaf} p={[0, 2.1, 0]} s={0.95} lo />
            <Ball c={shade(c ?? theme.leaf, 0.06)} p={[0.45, 1.8, 0.2]} s={0.6} lo />
            <Ball c={shade(c ?? theme.leaf, -0.05)} p={[-0.4, 1.75, -0.1]} s={0.65} lo />
          </group>
        );
      case "car": {
        const cc = c ?? "#e85d5d";
        return (
          <group>
            <Shadow p={[0, 0.01, 0]} s={[2.2, 1.1]} />
            <Box c={cc} p={[0, 0.6, 0]} s={[3.6, 0.7, 1.6]} />
            <Box c={shade(cc, 0.05)} p={[-0.2, 1.15, 0]} s={[2.0, 0.6, 1.45]} />
            <Box c="#bfe4f7" p={[-0.2, 1.15, 0.735]} s={[1.8, 0.45, 0.02]} e />
            <Box c="#bfe4f7" p={[-0.2, 1.15, -0.735]} s={[1.8, 0.45, 0.02]} e />
            {[
              [-1.2, 0.8],
              [1.2, 0.8],
              [-1.2, -0.8],
              [1.2, -0.8],
            ].map(([x, z], i) => (
              <Cyl key={i} c="#24262e" p={[x, 0.32, z]} s={[0.32, 0.22, 0.32]} r={[Math.PI / 2, 0, 0]} />
            ))}
          </group>
        );
      }
      case "sign": {
        return (
          <group>
            <Cyl c="#7b7f8c" p={[0, 1.1, 0]} s={[0.05, 2.2, 0.05]} lo />
            <SignBoard text={(prop.lines ?? [prop.label ?? "SIGN"]).join(" ")} color={c ?? brandColor} />
          </group>
        );
      }
      case "box":
        return (
          <group>
            <Shadow p={[0, 0.01, 0]} s={[0.55, 0.55]} />
            <Box c={c ?? "#d9a86a"} p={[0, 0.35, 0]} s={[0.7, 0.7, 0.7]} />
            <Box c={shade(c ?? "#d9a86a", -0.08)} p={[0, 0.701, 0]} s={[0.12, 0.01, 0.7]} />
          </group>
        );
      case "coin":
        return <Cyl c="#f2c230" p={[0, 0.5, 0]} s={[0.45, 0.08, 0.45]} r={[Math.PI / 2, t * 2, 0]} rough={0.35} />;
      case "money":
        return (
          <group>
            {[0, 1, 2, 3, 4].map((i) => (
              <Box key={i} c={i % 2 ? "#5cb85c" : "#4fa64f"} p={[0, 0.06 + i * 0.1, 0]} s={[0.9, 0.09, 0.45]} r={[0, i * 0.08, 0]} />
            ))}
          </group>
        );
      case "trophy":
        return (
          <group>
            <Box c="#6b4a2b" p={[0, 0.1, 0]} s={[0.5, 0.2, 0.5]} />
            <Cyl c="#f2c230" p={[0, 0.35, 0]} s={[0.06, 0.3, 0.06]} rough={0.35} />
            <Ball c="#f2c230" p={[0, 0.7, 0]} s={[0.3, 0.32, 0.3]} rough={0.35} />
          </group>
        );
      case "bench":
        return (
          <group>
            <Shadow p={[0, 0.01, 0]} s={[1.2, 0.5]} />
            <Box c={c ?? theme.wood} p={[0, 0.48, 0]} s={[2, 0.08, 0.5]} />
            <Box c={c ?? theme.wood} p={[0, 0.85, -0.22]} s={[2, 0.35, 0.06]} />
            <Box c="#3a3a44" p={[-0.85, 0.24, 0]} s={[0.06, 0.48, 0.45]} />
            <Box c="#3a3a44" p={[0.85, 0.24, 0]} s={[0.06, 0.48, 0.45]} />
          </group>
        );
      case "lamp":
        return (
          <group>
            <Cyl c="#3d4150" p={[0, 1.7, 0]} s={[0.06, 3.4, 0.06]} lo />
            <Ball c="#fff1c2" p={[0, 3.5, 0]} s={0.22} e />
          </group>
        );
      case "screen":
        return <Screen p={[0, 1.5, 0]} w={2.4} h={1.35} lines={prop.lines ?? [prop.label ?? ""]} progress={prop.progress} t={t} len={len} brand />;
      case "bed":
        return (
          <group>
            <Shadow p={[0, 0.01, 0]} s={[1.3, 0.8]} />
            <Box c="#c9ced8" p={[0, 0.45, 0]} s={[2.2, 0.2, 1.0]} />
            <Box c="#ffffff" p={[0, 0.62, 0]} s={[2.1, 0.16, 0.95]} />
            <Box c="#dfe9f5" p={[-0.8, 0.75, 0]} s={[0.45, 0.12, 0.7]} />
            <Box c="#9aa3b2" p={[-1.1, 0.75, 0]} s={[0.06, 0.9, 1.0]} />
          </group>
        );
      case "door":
        return (
          <group>
            <Box c="#ffffff" p={[0, 1.15, 0]} s={[1.2, 2.3, 0.1]} />
            <Box c={c ?? "#2bb3a3"} p={[0, 1.1, 0.03]} s={[1.0, 2.15, 0.1]} />
            <Ball c="#f2c230" p={[0.35, 1.1, 0.1]} s={0.05} />
          </group>
        );
      case "plant":
        return (
          <group>
            <Cyl c="#d97b55" p={[0, 0.25, 0]} s={[0.25, 0.5, 0.25]} lo />
            <Ball c={c ?? theme.leaf} p={[0, 0.75, 0]} s={[0.4, 0.5, 0.4]} lo />
            <Ball c={shade(c ?? theme.leaf, 0.08)} p={[0.15, 0.95, 0.1]} s={0.25} lo />
          </group>
        );
      case "rock":
        return <Ball c={c ?? "#9a9aa6"} p={[0, 0.25, 0]} s={[0.6, 0.4, 0.5]} lo />;
      case "clock": {
        const a = t * 1.2;
        return (
          <group position={[0, 2.6, 0]}>
            <Cyl c="#ffffff" s={[0.45, 0.06, 0.45]} r={[Math.PI / 2, 0, 0]} />
            <Cyl c={BLACK} p={[0, 0, -0.01]} s={[0.5, 0.05, 0.5]} r={[Math.PI / 2, 0, 0]} />
            <Box c={BLACK} p={[Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0.05]} s={[0.03, 0.32, 0.02]} r={[0, 0, -a]} />
            <Box c={BLACK} p={[Math.sin(a / 12) * 0.1, Math.cos(a / 12) * 0.1, 0.05]} s={[0.04, 0.22, 0.02]} r={[0, 0, -a / 12]} />
          </group>
        );
      }
      case "phone":
        return (
          <group position={[0, 0.9, 0]}>
            <Box c="#22252e" s={[0.9, 1.7, 0.08]} />
            <Plane c="#7fd3ff" e p={[0, 0, 0.045]} s={[0.8, 1.55, 1]} />
          </group>
        );
      default:
        return null;
    }
  })();
  return (
    <group position={[prop.x, prop.y ?? 0, prop.z]} rotation={[0, deg(prop.rotation ?? 0), 0]} scale={prop.scale ?? 1}>
      {inner}
    </group>
  );
};

const SignBoard: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const tex = useLabelTexture(text, color, 2.2);
  return (
    <group position={[0, 2.35, 0.06]}>
      <Box c="#f4f1ea" s={[1.5, 0.72, 0.06]} />
      <TexPlane tex={tex} p={[0, 0, 0.032]} s={[1.42, 0.65, 1]} />
    </group>
  );
};
