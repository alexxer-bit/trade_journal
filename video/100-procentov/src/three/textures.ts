import { useMemo } from "react";
import * as THREE from "three";
import { FONT, useFontReady } from "../fonts";
import type { ScreenProgress } from "../types";

const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

// Плашка бренда: цветной прямоугольник, значок ⊘ и название
export const drawPlate = (c: CanvasRenderingContext2D, x: number, y: number, h: number, name: string, color: string, icon = true) => {
  c.font = `900 ${Math.round(h * 0.55)}px ${FONT}`;
  const tw = c.measureText(name).width;
  const pad = h * 0.3;
  const iconW = icon ? h * 0.8 : 0;
  const w = pad * 2 + iconW + tw;
  c.fillStyle = color;
  roundRect(c, x, y, w, h, h * 0.12);
  c.fill();
  if (icon) {
    const cx = x + pad + h * 0.32;
    const cy = y + h / 2;
    const r = h * 0.26;
    c.strokeStyle = "#ffffff";
    c.lineWidth = h * 0.08;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(cx - r * 0.7, cy + r * 0.7);
    c.lineTo(cx + r * 0.7, cy - r * 0.7);
    c.stroke();
  }
  c.fillStyle = "#ffffff";
  c.textBaseline = "middle";
  c.textAlign = "left";
  c.fillText(name, x + pad + iconW, y + h / 2 + h * 0.03);
  return w;
};

const makeCanvas = (w: number, h: number) => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { cv, ctx: cv.getContext("2d")!, tex };
};

const fitText = (c: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight = 900) => {
  let s = size;
  c.font = `${weight} ${s}px ${FONT}`;
  while (c.measureText(text).width > maxW && s > 12) {
    s -= 2;
    c.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
};

export type ScreenDraw = {
  lines: string[];
  progress?: ScreenProgress;
  progressValue?: number;
  brand?: { name: string; color: string } | null;
  bg?: string;
  accent?: string;
};

// Экран/билборд: тёмная панель, плашка бренда, крупный текст, полоска прогресса
export const useScreenTexture = (aspect: number, draw: ScreenDraw) => {
  const ready = useFontReady();
  const W = 1024;
  const H = Math.round(W / aspect);
  const surf = useMemo(() => makeCanvas(W, H), [W, H]);
  if (ready) {
    const c = surf.ctx;
    c.clearRect(0, 0, W, H);
    c.fillStyle = draw.bg ?? "#1c2233";
    c.fillRect(0, 0, W, H);
    let y = H * 0.08;
    if (draw.brand) {
      drawPlate(c, W * 0.05, y, H * 0.14, draw.brand.name, draw.brand.color);
      y += H * 0.18;
    }
    const n = Math.max(1, draw.lines.length);
    const bottom = draw.progress ? H * 0.66 : H * 0.94;
    const avail = bottom - y;
    const lh = Math.min(H * 0.36, avail / n);
    // один размер шрифта на все строки — подбираем по самой длинной
    const lines = draw.lines.map((l) => l.toUpperCase());
    let size = Math.round(lh * 0.82);
    lines.forEach((l) => {
      size = Math.min(size, fitText(c, l, W * 0.88, size));
    });
    c.font = `900 ${size}px ${FONT}`;
    c.fillStyle = "#ffffff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const blockTop = y + (avail - lh * n) / 2;
    lines.forEach((line, i) => {
      c.fillText(line, W / 2, blockTop + lh * (i + 0.5));
    });
    if (draw.progress) {
      const v = Math.max(0, Math.min(100, draw.progressValue ?? draw.progress.to));
      const bx = W * 0.1;
      const by = H * 0.72;
      const bw = W * 0.8;
      const bh = H * 0.07;
      c.fillStyle = "rgba(255,255,255,0.15)";
      roundRect(c, bx, by, bw, bh, bh / 2);
      c.fill();
      c.fillStyle = draw.accent ?? "#3fd0d4";
      roundRect(c, bx, by, Math.max(bh, (bw * v) / 100), bh, bh / 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.font = `800 ${Math.round(H * 0.07)}px ${FONT}`;
      c.textAlign = "left";
      c.fillText(`${draw.progress.label ? draw.progress.label + " " : ""}${Math.round(v)}%`, bx, by + bh * 2.1);
    }
    surf.tex.needsUpdate = true;
  }
  return surf.tex;
};

// Наклейка/вывеска: цветной фон и текст
export const useLabelTexture = (text: string, color: string, aspect = 3, textColor = "#ffffff", withIcon = false) => {
  const ready = useFontReady();
  const W = 512;
  const H = Math.round(W / aspect);
  const surf = useMemo(() => makeCanvas(W, H), [W, H]);
  useMemo(() => {
    if (!ready) return;
    const c = surf.ctx;
    c.clearRect(0, 0, W, H);
    if (withIcon) {
      c.fillStyle = "rgba(0,0,0,0)";
      c.fillRect(0, 0, W, H);
      const pw = drawPlate(c, 0, 0, H, text, color);
      // центрируем плашку
      const img = c.getImageData(0, 0, Math.ceil(pw), H);
      c.clearRect(0, 0, W, H);
      c.fillStyle = color;
      c.fillRect(0, 0, W, H);
      c.putImageData(img, Math.round((W - pw) / 2), 0);
    } else {
      c.fillStyle = color;
      c.fillRect(0, 0, W, H);
      c.fillStyle = textColor;
      c.textAlign = "center";
      c.textBaseline = "middle";
      fitText(c, text.toUpperCase(), W * 0.88, Math.round(H * 0.55));
      c.fillText(text.toUpperCase(), W / 2, H / 2 + H * 0.03);
    }
    surf.tex.needsUpdate = true;
  }, [ready, text, color, textColor, withIcon, surf, W, H]);
  return surf.tex;
};

// Принт на футболке: динозавр (прозрачный фон), рисуется один раз
let dinoTex: THREE.CanvasTexture | null = null;
export const useDinoTexture = () => {
  return useMemo(() => {
    if (dinoTex) return dinoTex;
    const { ctx: c, tex } = makeCanvas(256, 256);
    const body = "#b5e655";
    const dark = "#5f9e2f";
    c.lineJoin = "round";
    c.lineCap = "round";
    const shape = () => {
      c.beginPath();
      // хвост
      c.moveTo(70, 150);
      c.quadraticCurveTo(30, 165, 12, 190);
      c.quadraticCurveTo(50, 185, 80, 172);
      // тело
      c.ellipse(122, 152, 62, 40, 0, Math.PI, Math.PI * 3, false);
      // шея и голова
      c.moveTo(150, 128);
      c.quadraticCurveTo(170, 90, 180, 62);
      c.lineTo(205, 70);
      c.quadraticCurveTo(190, 110, 178, 140);
      c.closePath();
      c.moveTo(222, 58);
      c.ellipse(200, 58, 24, 16, -0.15, 0, Math.PI * 2);
      // ноги
      for (const x of [78, 104, 138, 162]) c.rect(x, 168, 18, 44);
    };
    // белая обводка, чтобы динозавр читался на любой футболке
    shape();
    c.strokeStyle = "#ffffff";
    c.lineWidth = 14;
    c.stroke();
    c.fillStyle = body;
    shape();
    c.fill();
    // пятна и шипы
    c.fillStyle = dark;
    for (const [x, y, r] of [[105, 140, 9], [130, 160, 7], [150, 142, 6], [95, 165, 6]]) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 5; i++) {
      const x = 75 + i * 18;
      const y = 118 - Math.sin((i / 4) * Math.PI) * 6;
      c.beginPath();
      c.moveTo(x - 7, y + 6);
      c.lineTo(x, y - 9);
      c.lineTo(x + 7, y + 6);
      c.fill();
    }
    // глаз и улыбка
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(207, 53, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(209, 53, 3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(205, 62, 9, 0.2, 1.2);
    c.stroke();
    tex.needsUpdate = true;
    dinoTex = tex;
    return tex;
  }, []);
};
