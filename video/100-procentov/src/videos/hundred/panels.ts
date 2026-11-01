// In-world infographics of «100%»: every number, gauge and chart is a lit-up panel standing in the set (the screen
// in the hangar, the debate gauge, the skill chart on the wall, the fear gauge, the scoreboard, the 100 % pillars,
// the growth lid and the choice dial). A panel repaints its canvas only when its state key changes.
import * as THREE from "three";
import { FONT, fontReady } from "./font";
import { clamp01, easeOut, lin } from "./story";

export const GREEN = "#2ef57a", RED = "#ff2e3b", WHITE = "#f4f4f4", WARM = "#ffe2b0", DIM = "#0b120e";
export type G2 = CanvasRenderingContext2D;

export class Panel {
  cv: HTMLCanvasElement; g: G2; tex: THREE.CanvasTexture; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; key = "";
  constructor(public W: number, public H: number, w: number, h: number, glow = 1.5, transparent = false) {
    this.cv = document.createElement("canvas"); this.cv.width = W; this.cv.height = H;
    this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent, depthWrite: !transparent, side: THREE.DoubleSide });
    this.mat.color.setScalar(glow);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
  }
  paint(key: string, fn: (g: G2, W: number, H: number) => void) {
    key = (fontReady() ? "F|" : "-|") + key;
    if (key === this.key) return;
    this.key = key;
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.W, this.H);
    fn(g, this.W, this.H);
    this.tex.needsUpdate = true;
  }
}

export const font = (px: number, w = 800) => `${w} ${Math.round(px)}px ${FONT}, sans-serif`;
export const text = (g: G2, s: string, x: number, y: number, px: number, col: string, align: CanvasTextAlign = "center", w = 800) => {
  g.font = font(px, w); g.textAlign = align; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(s, x, y);
};
const glowText = (g: G2, s: string, x: number, y: number, px: number, col: string, blur = 28) => {
  g.save(); g.shadowColor = col; g.shadowBlur = blur; text(g, s, x, y, px, col); g.restore(); text(g, s, x, y, px, col);
};
const rr = (g: G2, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const scan = (g: G2, W: number, H: number, a = 0.18) => { g.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2); };
const hash = (n: number) => { const v = Math.sin(n * 91.7) * 43758.5453; return v - Math.floor(v); };

/** a horizontal fill bar with a % readout */
export const bar = (g: G2, x: number, y: number, w: number, h: number, v: number, col: string, track = "#1a2420") => {
  rr(g, x, y, w, h, h / 2); g.fillStyle = track; g.fill();
  if (v > 0.003) { rr(g, x, y, Math.max(h, w * v), h, h / 2); g.fillStyle = col; g.fill(); }
  rr(g, x, y, w, h, h / 2); g.lineWidth = 6; g.strokeStyle = "#e8f0ea"; g.stroke();
};

// ---------------- hangar screen ----------------
export type ScreenState = { t: number; f: number; id: number };
export const paintScreen = (p: Panel, s: ScreenState) => {
  const { t, f, id } = s;
  const q = (x: number, n = 30) => Math.round(x * n) / n;
  let key = "", fn: (g: G2, W: number, H: number) => void = () => {};
  const winScreen = (g: G2, W: number, H: number, pop: number, letters: number, fill: number, counter: number | null, big = 1, crack = 0, dim = 1) => {
    const bg = g.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H / 2, W * 0.7);
    bg.addColorStop(0, `rgba(20,70,40,${dim})`); bg.addColorStop(1, "#04100a");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.globalAlpha = dim;
    const s100 = 300 * big * (pop < 1 ? 0.6 + 0.55 * easeOut(pop) - 0.15 * easeOut(Math.max(0, pop * 2 - 1)) : 1);
    if (pop > 0) glowText(g, "100%", W / 2, H * (counter === null ? 0.36 : 0.32), s100, GREEN, 40);
    const word = "ПОБЕДА";
    const shown = word.slice(0, Math.max(0, Math.min(6, letters)));
    if (shown) glowText(g, shown.padEnd(6, " "), W / 2 + (6 - shown.length) * 0, H * (counter === null ? 0.66 : 0.6), 120 * big, WHITE, 18);
    if (fill > 0) { bar(g, W * 0.15, H * 0.8, W * 0.62, 46, fill, GREEN); text(g, `${Math.round(fill * 100)}%`, W * 0.86, H * 0.8 + 23, 58, GREEN); }
    if (counter !== null) { text(g, "ПОБЕД:", W * 0.36, H * 0.86, 70, WHITE); glowText(g, String(counter), W * 0.62, H * 0.86, 96, GREEN, 20); }
    g.globalAlpha = 1;
    if (crack > 0) {
      g.strokeStyle = "#dfe8e2"; g.lineWidth = 7; g.lineCap = "round";
      const pts = [[0.48, 0], [0.5, 0.22], [0.44, 0.38], [0.53, 0.55], [0.47, 0.74], [0.52, 1]];
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H))); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(0.44 * W, 0.38 * H); g.lineTo(0.3 * W, 0.46 * H); g.moveTo(0.53 * W, 0.55 * H); g.lineTo(0.7 * W, 0.6 * H); g.stroke();
    }
    scan(g, W, H, 0.14);
  };
  if (id === 1) {
    const pop = clamp01((t - 0.45) / 0.35), letters = Math.floor((t - 0.65) / 0.12) + 1, fill = clamp01((t - 1.0) / 1.6);
    key = `1|${q(pop)}|${letters}|${q(fill, 50)}`;
    fn = (g, W, H) => {
      if (t < 0.45) { g.fillStyle = "#050807"; g.fillRect(0, 0, W, H); text(g, "?", W / 2, H / 2, 260, "#1d3a28"); scan(g, W, H); return; }
      winScreen(g, W, H, pop, letters, fill, null);
    };
  } else if (id === 2 || id === 3 || id === 4) {
    const n = id === 2 ? (t < 4.75 ? 1 : 2) : id === 3 ? (t < 5.9 ? 2 : Math.min(48, 3 + Math.floor((t - 5.9) * 40))) : Math.min(999, 48 + Math.floor((t - 6.6) ** 2 * 120));
    const coin = id === 2 && t >= 4.75;
    const big = id === 4 ? 1.15 + 0.04 * Math.sin(t * 9) : 1;
    key = `2|${n}|${coin}|${q(big, 40)}`;
    fn = (g, W, H) => {
      winScreen(g, W, H, 1, 6, 0, n, big);
      if (coin) { glowText(g, "ОРЁЛ ✓", W * 0.84, H * 0.12, 64, GREEN, 14); }
    };
  } else if (id === 11) {
    if (t < 26.9) {
      const dim = t < 26.25 ? 0.75 : 1;
      key = `11a|${dim}`;
      fn = (g, W, H) => winScreen(g, W, H, 1, 6, 0, 1000, 1, 0, dim);
    } else {
      const k = Math.floor(f / 2), heavy = t < 28.4;
      key = `11b|${k}`;
      fn = (g, W, H) => {
        g.fillStyle = heavy ? "#2a0507" : "#120203"; g.fillRect(0, 0, W, H);
        const n = heavy ? 10 : 4;
        for (let i = 0; i < n; i++) { const y = hash(k * 13 + i) * H, h = 10 + hash(k * 7 + i) * 60; g.fillStyle = `rgba(255,46,59,${0.15 + 0.3 * hash(i + k)})`; g.fillRect(0, y, W, h); }
        const dx = (hash(k) - 0.5) * (heavy ? 60 : 16);
        g.save(); g.globalAlpha = 0.6; text(g, "0%", W / 2 + dx + 14, H * 0.4, 330, "#36d1ff"); g.restore();
        glowText(g, "0%", W / 2 + dx, H * 0.4, 330, RED, 40);
        text(g, "ОШИБКА СИСТЕМЫ", W / 2 - dx, H * 0.78, 96, WHITE);
        scan(g, W, H, 0.3);
      };
    }
  } else if (id === 15) {
    const off = clamp01((t - 45.72) / 0.3), dot = clamp01((t - 46.02) / 0.25), pulse = 0.5 + 0.5 * Math.sin(t * 8);
    key = `15|${q(off)}|${q(dot)}|${q(pulse, 8)}`;
    fn = (g, W, H) => {
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      if (dot >= 1) return;
      g.save();
      if (off > 0) { g.translate(W / 2, H / 2); g.scale(1 - 0.98 * dot, Math.max(0.006, 1 - off)); g.translate(-W / 2, -H / 2); }
      winScreen(g, W, H, 1, 6, 0, null, 0.95, 1, 0.8);
      g.globalAlpha = 0.5 + 0.5 * pulse; rr(g, W * 0.24, H * 0.82, W * 0.52, 84, 40); g.fillStyle = "#1c6b3d"; g.fill();
      text(g, "ПРОДОЛЖИТЬ ПОБЕЖДАТЬ?", W / 2, H * 0.82 + 42, 50, WHITE); g.globalAlpha = 1;
      if (off > 0) { g.fillStyle = `rgba(255,255,255,${off})`; g.fillRect(0, 0, W, H); }
      g.restore();
    };
  }
  p.paint(key, fn);
};

// ---------------- room ----------------
export const paintDebate = (p: Panel, v: number) => {
  p.paint(`d|${Math.round(v * 60)}`, (g, W, H) => {
    rr(g, 6, 6, W - 12, H - 12, 30); g.fillStyle = "rgba(10,14,18,0.86)"; g.fill(); g.lineWidth = 8; g.strokeStyle = WHITE; g.stroke();
    text(g, "СПОР", W / 2, 46, 48, WHITE);
    const x = 60, w = W - 120, y = 96, h = 64, s = w * v;
    rr(g, x, y, w, h, 32); g.fillStyle = RED; g.fill();
    g.save(); rr(g, x, y, w, h, 32); g.clip(); g.fillStyle = GREEN; g.fillRect(x, y, s, h); g.restore();
    rr(g, x, y, w, h, 32); g.lineWidth = 6; g.strokeStyle = WHITE; g.stroke();
    text(g, `ТЫ ${Math.round(v * 100)}%`, x + 10, y + h + 52, 50, GREEN, "left");
    text(g, `${Math.round((1 - v) * 100)}%`, x + w - 10, y + h + 52, 50, RED, "right");
  });
};
export const paintSkill = (p: Panel, u: number, t: number) => {
  p.paint(`s|${Math.round(u * 60)}`, (g, W, H) => {
    g.fillStyle = "#f1ece0"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#2a2a2a"; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
    text(g, "НАВЫК", 40, 60, 60, "#2a2a2a", "left");
    const x0 = 80, y0 = H - 70, x1 = W - 60, y1 = 120;
    g.lineWidth = 6; g.beginPath(); g.moveTo(x0, y1 - 20); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
    const N = 40, pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const val = s < 0.55 ? 0.15 + 1.25 * s : 0.84 - 0.84 * easeOut((s - 0.55) / 0.45 * Math.min(1, u * 1.2));
      if (s > 0.55 && s > 0.55 + 0.45 * u) break;
      pts.push([x0 + (x1 - x0) * s, y0 - (y0 - y1) * val]);
    }
    g.lineWidth = 12; g.lineJoin = "round"; g.lineCap = "round";
    g.strokeStyle = "#2c9e5a"; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    const k = pts.findIndex(([x]) => x > x0 + (x1 - x0) * 0.55);
    if (k > 0) { g.strokeStyle = "#d42a32"; g.beginPath(); pts.slice(k - 1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
    if (u > 0.85) text(g, "↓", W - 110, 70, 90, "#d42a32");
  });
};

// ---------------- stadium ----------------
export const paintFear = (p: Panel, v: number) => {
  p.paint(`f|${Math.round(v * 100)}`, (g, W, H) => {
    rr(g, 6, 6, W - 12, H - 12, 34); g.fillStyle = "rgba(10,12,20,0.9)"; g.fill(); g.lineWidth = 8; g.strokeStyle = WHITE; g.stroke();
    text(g, "СТРАХ ПОРАЖЕНИЯ", W / 2, 70, 58, WHITE);
    bar(g, 60, 150, W - 120, 80, v, RED, "#2a1416");
    glowText(g, `${Math.round(v * 100)}%`, W / 2, 320, 120, v < 0.02 ? GREEN : RED, 22);
  });
};
export type BoardMode = { kind: "race"; time: number } | { kind: "wins" } | { kind: "count"; n: number } | { kind: "winner"; k: number };
export const paintBoard = (p: Panel, m: BoardMode) => {
  const key = m.kind === "race" ? `r|${m.time.toFixed(1)}` : m.kind === "count" ? `c|${m.n}` : m.kind === "winner" ? `w|${Math.round(m.k * 30)}` : "wins";
  p.paint(key, (g, W, H) => {
    g.fillStyle = "#06080f"; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,0.05)"; for (let x = 0; x < W; x += 14) for (let y = 0; y < H; y += 14) g.fillRect(x, y, 8, 8);
    if (m.kind === "race") { text(g, "ФИНИШ", W / 2, H * 0.28, 110, WHITE); glowText(g, `${m.time.toFixed(1)} с`, W / 2, H * 0.66, 170, GREEN); }
    else if (m.kind === "wins") { text(g, "ПОБЕД", W / 2, H * 0.28, 110, WHITE); glowText(g, "999+", W / 2, H * 0.66, 190, GREEN); }
    else if (m.kind === "count") { text(g, "СТАРТ ЧЕРЕЗ", W / 2, H * 0.28, 100, WHITE); glowText(g, String(m.n), W / 2, H * 0.68, 200, WHITE); }
    else {
      const s = 0.7 + 0.3 * easeOut(m.k);
      text(g, "ПОБЕДИТЕЛЬ:", W / 2, H * 0.27, 100, WHITE);
      g.save(); g.translate(W / 2, H * 0.66); g.scale(s, s); glowText(g, "ТЫ", 0, 0, 220, GREEN, 30); g.restore();
    }
  });
};

// ---------------- void ----------------
export const paintPillar = (p: Panel, crack: number) => {
  p.paint(`p|${crack > 0 ? 1 : 0}`, (g, W, H) => {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#d9fbe6"); bg.addColorStop(1, "#7fcf9e");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H * 0.3); g.rotate(-Math.PI / 2); text(g, "100%", 0, 0, 150, "#0f3d24"); g.restore();
    for (let i = 0; i < 10; i++) { const y = H * (0.55 + i * 0.045); g.fillStyle = "#0f3d24"; g.fillRect(W * 0.2, y, W * 0.6, 10); }
    if (crack > 0) {
      g.strokeStyle = "#08130c"; g.lineWidth = 8; g.beginPath(); g.moveTo(W * 0.1, H * 0.02); g.lineTo(W * 0.5, H * 0.16); g.lineTo(W * 0.35, H * 0.27); g.lineTo(W * 0.7, H * 0.4); g.stroke();
    }
  });
};
export const paintGrowth = (p: Panel, t: number) => {
  const k = Math.floor(t * 10);
  p.paint(`g|${k}`, (g, W, H) => {
    rr(g, 6, 6, W - 12, H - 12, 30); g.fillStyle = "rgba(8,10,12,0.92)"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#cfd8d2"; g.stroke();
    text(g, "РОСТ:", W * 0.3, 80, 80, WHITE); glowText(g, "0%", W * 0.62, 80, 100, RED, 18);
    g.strokeStyle = RED; g.lineWidth = 10; g.beginPath(); g.moveTo(60, H * 0.68); g.lineTo(W - 60, H * 0.68); g.stroke();
    const x = 60 + ((k % 20) / 20) * (W - 120); g.fillStyle = RED; g.beginPath(); g.arc(x, H * 0.68, 16, 0, Math.PI * 2); g.fill();
  });
};
export const paintChoice = (p: Panel, t: number) => {
  // needle swings across 0..100, settles at 50, then the number turns into "?"
  const v = t < 49.3 ? 0.5 + 0.45 * Math.sin((t - 47) * 2.6) * Math.exp(-Math.max(0, t - 48.2) * 0.25) : 0.5 + 0.12 * Math.sin((t - 49.3) * 7) * Math.exp(-(t - 49.3) * 3.5);
  const q = t > 50.2;
  p.paint(`c|${Math.round(v * 200)}|${q}`, (g, W, H) => {
    rr(g, 6, 6, W - 12, H - 12, 36); g.fillStyle = "rgba(20,14,10,0.88)"; g.fill(); g.lineWidth = 8; g.strokeStyle = WARM; g.stroke();
    text(g, "ТВОЙ ВЫБОР", W / 2, 66, 64, WARM);
    const cx = W / 2, cy = H - 70, r = 290;
    g.lineWidth = 30; g.lineCap = "butt";
    g.strokeStyle = RED; g.beginPath(); g.arc(cx, cy, r, Math.PI, Math.PI * 1.5); g.stroke();
    g.strokeStyle = GREEN; g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.5, Math.PI * 2); g.stroke();
    text(g, "0%", cx - r, cy + 40, 44, WARM); text(g, "100%", cx + r, cy + 40, 44, WARM);
    const a = Math.PI + Math.PI * v;
    g.strokeStyle = WHITE; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30)); g.stroke();
    g.fillStyle = WHITE; g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.fill();
    glowText(g, q ? "?" : `${Math.round(v * 100)}%`, cx, cy - 120, 120, WARM, 24);
  });
};
export { lin };
