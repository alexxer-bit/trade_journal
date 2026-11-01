import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { useCtx } from "../ctx";
import { FONT } from "../fonts";
import type { PlateSpec, TitleSpec } from "../types";

export const barHeight = (width: number, height: number) => Math.max(0, Math.round((height - width / 2.39) / 2));

export const Letterbox: React.FC = () => {
  const { width, height } = useVideoConfig();
  const bar = barHeight(width, height);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: bar, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bar, background: "#000" }} />
    </AbsoluteFill>
  );
};

const BanIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <line x1="5.8" y1="18.2" x2="18.2" y2="5.8" />
  </svg>
);

export const PlateBox: React.FC<{ text: string; height: number; color: string; icon?: boolean }> = ({ text, height, color, icon = true }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: height * 0.22,
      height,
      padding: `0 ${height * 0.32}px`,
      background: color,
      borderRadius: height * 0.1,
      color: "#fff",
      fontFamily: FONT,
      fontWeight: 900,
      fontSize: height * 0.52,
      letterSpacing: height * 0.01,
    }}
  >
    {icon ? <BanIcon size={height * 0.62} /> : null}
    {text}
  </div>
);

// Крупный белый титр капсом с точкой, как «ONE SHOT.» на референсе
export const Title: React.FC<{ spec: TitleSpec; t: number; len: number; letterbox: boolean }> = ({ spec, t, len, letterbox }) => {
  const { fps, width, height } = useVideoConfig();
  const at = spec.at ?? 0;
  const until = spec.until ?? len;
  if (t < at || t > until) return null;
  const local = t - at;
  const s = spring({ frame: Math.round(local * fps), fps, config: { damping: 14, stiffness: 180 } });
  const out = interpolate(until - t, [0, 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const size = (spec.size === "small" ? 0.045 : spec.size === "medium" ? 0.065 : 0.09) * height;
  const bar = letterbox ? barHeight(width, height) : 0;
  const pos = spec.position ?? "center";
  const style: React.CSSProperties = {
    position: "absolute",
    fontFamily: FONT,
    fontWeight: 900,
    fontSize: size,
    color: "#fff",
    textTransform: "uppercase",
    lineHeight: 1.02,
    letterSpacing: size * 0.01,
    textShadow: `0 ${size * 0.05}px ${size * 0.25}px rgba(0,0,0,0.35)`,
    opacity: out * Math.min(1, s * 1.4),
    transform: `scale(${0.85 + 0.15 * s})`,
    whiteSpace: "pre-line",
    maxWidth: width * 0.8,
  };
  const pad = width * 0.07;
  if (pos === "left") Object.assign(style, { left: pad, top: "50%", transform: `translateY(-50%) scale(${0.85 + 0.15 * s})`, transformOrigin: "left center" });
  else if (pos === "right") Object.assign(style, { right: pad, top: "50%", textAlign: "right", transform: `translateY(-50%) scale(${0.85 + 0.15 * s})`, transformOrigin: "right center" });
  else if (pos === "top") Object.assign(style, { top: bar + height * 0.07, left: 0, right: 0, textAlign: "center", maxWidth: "none" });
  else if (pos === "bottom") Object.assign(style, { bottom: bar + height * 0.07, left: 0, right: 0, textAlign: "center", maxWidth: "none" });
  else Object.assign(style, { top: "50%", left: 0, right: 0, textAlign: "center", transform: `translateY(-50%) scale(${0.85 + 0.15 * s})`, maxWidth: "none" });
  return <div style={style}>{spec.text}</div>;
};

export const Plate: React.FC<{ spec: PlateSpec; t: number; len: number; letterbox: boolean }> = ({ spec, t, len, letterbox }) => {
  const { fps, width, height } = useVideoConfig();
  const { brandColor, brandName, project } = useCtx();
  const at = spec.at ?? 0;
  if (t < at) return null;
  const s = spring({ frame: Math.round((t - at) * fps), fps, config: { damping: 13 } });
  const out = interpolate(len - t, [0, 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar = letterbox ? barHeight(width, height) : 0;
  const h = height * 0.075;
  const pos = spec.position ?? "top-left";
  const style: React.CSSProperties = { position: "absolute", opacity: out, transform: `scale(${0.6 + 0.4 * s})` };
  if (pos === "top-left") Object.assign(style, { left: width * 0.05, top: bar + height * 0.05, transformOrigin: "left top" });
  if (pos === "top-right") Object.assign(style, { right: width * 0.05, top: bar + height * 0.05, transformOrigin: "right top" });
  if (pos === "top") Object.assign(style, { left: 0, right: 0, top: bar + height * 0.05, textAlign: "center" });
  if (pos === "center") Object.assign(style, { left: 0, right: 0, top: "45%", textAlign: "center" });
  return (
    <div style={style}>
      <PlateBox text={spec.text ?? brandName} height={pos === "center" ? h * 1.6 : h} color={brandColor} icon={project.brand?.icon !== "none"} />
    </div>
  );
};

export type Word = { text: string; start: number; end: number };

// Субтитры в нижней кинополосе (или внизу кадра без полос)
export const Subtitles: React.FC<{ words: Word[]; time: number; letterbox: boolean }> = ({ words, time, letterbox }) => {
  const { width, height } = useVideoConfig();
  const bar = letterbox ? barHeight(width, height) : 0;
  const chunks = React.useMemo(() => {
    const out: Word[][] = [];
    let cur: Word[] = [];
    words.forEach((w, i) => {
      cur.push(w);
      const next = words[i + 1];
      const gap = next ? next.start - w.end : 99;
      if (cur.length >= 4 || gap > 0.35 || /[.!?,]$/.test(w.text)) {
        out.push(cur);
        cur = [];
      }
    });
    if (cur.length) out.push(cur);
    return out;
  }, [words]);
  const chunk = chunks.find((c) => time >= c[0].start - 0.05 && time <= c[c.length - 1].end + 0.15);
  if (!chunk) return null;
  const size = height * 0.042;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: letterbox ? bar / 2 - size * 0.6 : height * 0.06,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        color: "#fff",
        textShadow: letterbox ? "none" : "0 2px 10px rgba(0,0,0,0.6)",
      }}
    >
      {chunk.map((w, i) => (
        <span key={i} style={{ color: time >= w.start && time <= w.end + 0.05 ? "#ffd84a" : "#fff" }}>
          {w.text.replace(/[,.]$/, "")}
          {i < chunk.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
};
