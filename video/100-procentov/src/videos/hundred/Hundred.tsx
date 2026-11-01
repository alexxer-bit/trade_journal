// «Что, если твой шанс на победу всегда 100%?» — flat characters in a 3D toon world (the cartoon-short skill's
// look: world ink -> lens blur -> bloom -> neutral tone map -> grade), dark DarkStickmen palette: green = win,
// red = danger, warm white = the unknown. Sound is mixed separately (scripts/mix.mjs) and muxed onto the render.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, interpolate, delayRender, continueRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect } from "./grade";
import { MGRADE } from "./mood";
import { TOTAL, FLASHES, SHOTS, layersAt, dofAt, T, FPS } from "./story";
import { FONT, useFontReady } from "./font";

export const HUNDRED_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.7, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.65 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  // the composer's first render after mount comes out black: render a few warm-up frames before the first capture
  const advance = useThree((st) => st.advance);
  const [warm] = useState(() => delayRender("composer warm-up"));
  useEffect(() => { let n = 0; const go = () => { advance(performance.now()); if (++n < 3) requestAnimationFrame(go); else continueRender(warm); }; requestAnimationFrame(go); }, [advance, warm]);
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(MGRADE.hangar, 1),
  }), [camera, scene]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  const mood = SHOTS[id - 1].mood;
  const tag = fx.grade as unknown as { _m?: string };
  if (tag._m !== mood) { fx.grade.set(MGRADE[mood]); tag._m = mood; }
  fx.grade.amount = 1;
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.1, far: 400 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const HundredShort: React.FC = () => {
  const f = useCurrentFrame();
  useFontReady();
  const t = f / FPS;
  let flash = 0;
  for (const a of FLASHES) if (f >= a && f < a + 4) flash = [1, 0.75, 0.45, 0.2][f - a];
  // error shot fades to black before the void; the finale goes white, then dark, with the question
  const toBlack = interpolate(t, [29.5, 30.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (t < 30.3 ? 1 : 0)
    + interpolate(t, [T.white1 + 0.2, T.dark + 0.4], [0, 0.88], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const white = interpolate(t, [T.white0 + 0.4, T.white1], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (t < T.dark + 0.4 ? 1 : 0);
  const ask = interpolate(t, [T.ask, T.ask + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const askScale = interpolate(t, [T.ask, T.ask + 0.35, T.ask + 0.5], [1.25, 0.96, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#05060a" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {white > 0 && <AbsoluteFill style={{ background: "#fff3df", opacity: white }} />}
      {toBlack > 0 && <AbsoluteFill style={{ background: "#05060a", opacity: Math.min(1, toBlack) }} />}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      {ask > 0 && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 118, lineHeight: 1.05, color: "#fff", textAlign: "center", opacity: ask, transform: `scale(${askScale})`,
            textShadow: "0 0 30px rgba(255,214,150,0.8), 0 6px 0 #000", WebkitTextStroke: "3px #111", padding: "0 60px" }}>
            А ТЫ<br />РИСКНУЛ<br />БЫ?
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
