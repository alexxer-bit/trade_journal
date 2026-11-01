import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useCtx } from "./ctx";
import { FONT } from "./fonts";
import { barHeight, Letterbox, Plate, PlateBox, Title } from "./overlay/Overlays";
import { THEMES } from "./theme";
import { World, crowdActors, type WorldInput } from "./three/World";
import type { Scene, SubScene } from "./types";

const Canvas3D: React.FC<{ input: WorldInput; t: number; len: number; width: number; height: number; themeKey: string }> = ({
  input,
  t,
  len,
  width,
  height,
}) => {
  const { theme } = useCtx();
  const sceneTheme = input.scene.time === "night" ? THEMES.night : input.scene.time === "sunset" ? THEMES.dusk : theme;
  return (
    <ThreeCanvas width={width} height={height} flat linear={false} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <World input={input} theme={sceneTheme} t={t} len={len} />
    </ThreeCanvas>
  );
};

const SplitHalf: React.FC<{ sub: SubScene; scene: Scene; t: number; len: number; width: number; height: number; side: "left" | "right" }> = ({
  sub,
  scene,
  t,
  len,
  width,
  height,
}) => {
  const { brandName, brandColor, project } = useCtx();
  const { width: fullW } = useVideoConfig();
  const labelTop = (project.letterbox !== false ? barHeight(fullW, height) : 0) + height * 0.035;
  const input: WorldInput = useMemo(
    () => ({
      location: sub.location ?? "studio",
      scene: { ...scene, bg: sub.bg, screen: undefined },
      actors: sub.actors ?? [],
      props: sub.props ?? [],
      camera: sub.camera ?? { shot: "medium" },
      bg: sub.bg,
    }),
    [sub, scene],
  );
  const isBrand = sub.label && brandName && sub.label.toUpperCase() === brandName.toUpperCase();
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      <Canvas3D input={input} t={t} len={len} width={width} height={height} themeKey="" />
      {sub.label ? (
        <div style={{ position: "absolute", top: labelTop, left: 0, right: 0, textAlign: "center" }}>
          {isBrand ? (
            <PlateBox text={brandName} height={height * 0.075} color={brandColor} />
          ) : (
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: height * 0.07, color: "#fff", textShadow: "0 3px 14px rgba(0,0,0,0.25)" }}>
              {sub.label.toUpperCase()}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { project, theme } = useCtx();
  const t = frame / fps;
  const len = Math.max(0.1, scene.end - scene.start);
  const letterbox = project.letterbox !== false;

  const input: WorldInput = useMemo(() => {
    const crowd = scene.crowd ? crowdActors(scene.crowd, theme, (scene.actors ?? []).map((a) => a.shirt ?? "").filter(Boolean)) : [];
    return {
      location: scene.location ?? "studio",
      scene,
      actors: [...(scene.actors ?? []), ...crowd],
      props: scene.props ?? [],
      camera: scene.camera,
      bg: scene.bg,
    };
  }, [scene, theme]);

  // переходы
  const tr = scene.transition ?? "cut";
  let opacity = 1;
  let translate = 0;
  let blur = 0;
  let flash = 0;
  if (tr === "fade") opacity = interpolate(t, [0, 0.35], [0, 1], { extrapolateRight: "clamp" });
  if (tr === "whip") {
    const k = interpolate(t, [0, 0.28], [1, 0], { extrapolateRight: "clamp" });
    translate = k * k * width * 0.25;
    blur = k * 28;
  }
  if (tr === "flash") flash = interpolate(t, [0, 0.25], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity, transform: `translateX(${translate}px)`, filter: blur ? `blur(${blur}px)` : undefined }}>
        {scene.split ? (
          <div style={{ display: "flex", width, height, gap: Math.round(width * 0.006), background: "#fff" }}>
            <SplitHalf sub={scene.split.left} scene={scene} t={t} len={len} width={Math.floor(width / 2 - width * 0.003)} height={height} side="left" />
            <SplitHalf sub={scene.split.right} scene={scene} t={t} len={len} width={Math.floor(width / 2 - width * 0.003)} height={height} side="right" />
          </div>
        ) : (
          <Canvas3D input={input} t={t} len={len} width={width} height={height} themeKey={project.theme} />
        )}
      </AbsoluteFill>
      {scene.plate ? <Plate spec={scene.plate} t={t} len={len} letterbox={letterbox} /> : null}
      {scene.title ? <Title spec={scene.title} t={t} len={len} letterbox={letterbox} /> : null}
      {letterbox ? <Letterbox /> : null}
      {flash > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: flash }} /> : null}
    </AbsoluteFill>
  );
};
