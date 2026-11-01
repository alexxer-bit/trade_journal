import { Audio } from "@remotion/media";
import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ProjectCtx } from "./ctx";
import { useFontReady } from "./fonts";
import { Subtitles, type Word } from "./overlay/Overlays";
import { SceneView } from "./SceneView";
import { THEMES } from "./theme";
import type { Project, SfxSpec } from "./types";
import { dbToGain } from "./util";

export const SFX_NAMES = [
  "whoosh",
  "swoosh",
  "rise",
  "pop",
  "click",
  "ding",
  "thud",
  "impact",
  "tick",
  "glitch",
  "heartbeat",
  "sparkle",
  "buzz",
  "boing",
  "scribble",
  "cash",
];

// Звонкие звуки слышно сильнее при той же громкости — приглушаем их отдельно
const SFX_GAIN: Record<string, number> = {
  sparkle: 0.4,
  ding: 0.55,
  glitch: 0.55,
  buzz: 0.55,
  cash: 0.6,
  rise: 0.7,
  scribble: 0.7,
  whoosh: 0.8,
  swoosh: 0.8,
};

const SubtitleLayer: React.FC<{ words: Word[]; letterbox: boolean }> = ({ words, letterbox }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Subtitles words={words} time={frame / fps} letterbox={letterbox} />;
};

// Музыка по главам: части перекрываются на XFADE секунд, громкость плавно меняется
const XFADE = 1.6;
const MusicParts: React.FC<{ parts: NonNullable<Project["audio"]["musicParts"]>; gain: number; total: number }> = ({ parts, gain, total }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {parts.map((p, i) => {
        const start = Math.max(0, p.from - XFADE / 2);
        const end = i + 1 < parts.length ? parts[i + 1].from + XFADE / 2 : total;
        const from = Math.round(start * fps);
        const dur = Math.max(1, Math.round(end * fps) - from);
        const fadeIn = i === 0 ? 1 : Math.round(XFADE * fps);
        const fadeOut = i + 1 < parts.length ? Math.round(XFADE * fps) : Math.round(2.5 * fps);
        const g = gain * dbToGain(p.db ?? 0);
        return (
          <Sequence key={`m${i}`} from={from} durationInFrames={dur} layout="none" name={`music ${p.src}`}>
            <Audio
              src={staticFile(p.src)}
              loop
              trimBefore={Math.round((p.offset ?? 0) * fps)}
              volume={(f) => g * Math.min(1, f / fadeIn, (dur - f) / fadeOut)}
            />
          </Sequence>
        );
      })}
    </>
  );
};

export const StickmanVideo: React.FC<{ project: Project; words: Word[] }> = ({ project, words }) => {
  const { fps } = useVideoConfig();
  const theme = THEMES[project.theme] ?? THEMES.pastel;
  const ctx = useMemo(
    () => ({ project, theme, brandColor: project.brand?.color ?? "#2bb3b1", brandName: project.brand?.name ?? "" }),
    [project, theme],
  );
  // пока шрифт не загружен, кадр не рисуем: иначе надписи на 3D-экранах выйдут пустыми
  const fontReady = useFontReady();
  const sfxGain = dbToGain(project.audio.sfxDb ?? -13);
  const musicGain = dbToGain(project.audio.musicDb ?? -22);

  // все звуки: явные из раскадровки + автоматические на переходах и титрах
  const sfx = useMemo(() => {
    const list: SfxSpec[] = [];
    project.scenes.forEach((s) => {
      (s.sfx ?? []).forEach((x) => list.push({ ...x, at: s.start + x.at }));
      const has = (name: string) => (s.sfx ?? []).some((x) => x.name === name);
      if (s.transition === "whip" && !has("whoosh")) list.push({ name: "whoosh", at: s.start });
      if (s.transition === "flash" && !has("impact")) list.push({ name: "impact", at: s.start });
      if (s.title && !has("pop") && !has("thud")) list.push({ name: "pop", at: s.start + (s.title.at ?? 0), volume: 0.7 });
    });
    return list.filter((x) => SFX_NAMES.includes(x.name));
  }, [project]);

  if (!fontReady) return <AbsoluteFill style={{ background: "#000" }} />;

  return (
    <ProjectCtx.Provider value={ctx}>
      <AbsoluteFill style={{ background: "#000" }}>
        {project.scenes.map((s, i) => {
          const from = Math.round(s.start * fps);
          const dur = Math.max(1, Math.round(s.end * fps) - from);
          return (
            <Sequence key={i} from={from} durationInFrames={dur} premountFor={Math.round(fps * 0.5)} name={`${i + 1}. ${s.location ?? (s.split ? "split" : "")} ${s.note ?? ""}`}>
              <SceneView scene={s} />
            </Sequence>
          );
        })}
        {project.subtitles ? <SubtitleLayer words={words} letterbox={project.letterbox !== false} /> : null}
        <Audio src={staticFile(project.audio.voice)} />
        {project.audio.musicParts?.length ? (
          <MusicParts parts={project.audio.musicParts} gain={musicGain} total={project.duration} />
        ) : project.audio.music ? (
          <Audio src={staticFile(project.audio.music)} volume={musicGain} loop />
        ) : null}
        {sfx.map((x, i) => (
          <Sequence key={`sfx${i}`} from={Math.max(0, Math.round(x.at * fps))} durationInFrames={Math.round(fps * 3)} layout="none">
            <Audio src={staticFile(`sfx/${x.name}.wav`)} volume={sfxGain * (SFX_GAIN[x.name] ?? 1) * (x.volume ?? 1)} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </ProjectCtx.Provider>
  );
};
