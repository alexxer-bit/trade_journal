// The world of «100%»: four sets (hangar with the giant screen, room, night stadium, the void) built from simple
// painted geometry with the skill's two-tone shading and world ink; only the set of the current shot is visible.
// update(id, f, cam, scene) poses the camera, the key light, the props, the infographic panels and the cast.
import * as THREE from "three";
import { twoTone, TONE, CHAR, untone } from "./shade";
import { MOODS } from "./mood";
import { NOINK } from "./ink";
import { Cast, Person, FxCard } from "./castlite";
import { HERO, RIVAL, EXAMINER, FRIEND, townsfolk, fxBurst, fxStars, Pen, INK, Outfit } from "./toon";
import {
  FPS, SHOTS, SetName, V3, T, camAt, clamp01, easeOut, ramp, glide, heroRaceX, rivalRaceX, lazyX, sprintX, pillarY, pillarR, walkZ,
} from "./story";
import { Panel, paintScreen, paintDebate, paintSkill, paintFear, paintBoard, paintPillar, paintGrowth, paintChoice } from "./panels";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lam = (color: string, map?: THREE.Texture, emissive?: string) => {
  const m = twoTone(new THREE.MeshLambertMaterial({ color, map: map ?? null }));
  if (emissive) m.emissive.set(emissive);
  return m;
};
const box = (g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b;
};
const cyl = (g: THREE.Object3D, r0: number, r1: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 20) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; g.add(c); return c;
};
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep: [number, number] = [1, 1]) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8;
  return t;
};
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
// painted textures: seams are painted in as dark tints (the skill's paint.ts rule), albedo comes from the material colour
const tiles = canvasTex(512, 512, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + 0.04 * hh(i)})`; g.fillRect(hh(i, 1) * 512, hh(i, 2) * 512, 3 + 9 * hh(i, 3), 3 + 9 * hh(i, 4)); }
  g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(0, 0, 512, 6); g.fillRect(0, 0, 6, 512);
}, [16, 16]);
const planks = canvasTex(512, 512, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(25, 40%, ${78 + 10 * hh(i)}%)`; g.fillRect(0, i * 64, 512, 64); g.fillStyle = "rgba(40,20,10,0.6)"; g.fillRect(0, i * 64, 512, 4); g.fillRect(((i * 197) % 512), i * 64, 4, 64); }
}, [6, 6]);
const lanes = canvasTex(1024, 256, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${0.04 * hh(i)})`; g.fillRect(hh(i, 1) * 1024, hh(i, 2) * 256, 4, 4); }
  g.fillStyle = "#f6f2ea"; for (let k = 0; k <= 4; k++) g.fillRect(0, 4 + k * 61, 1024, 6);
}, [30, 1]);
const grass = canvasTex(256, 256, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 0, 128, 256); }, [20, 20]);
const radial = (inner: string, outer: string) => canvasTex(256, 256, (g) => {
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
});
const vgrad = canvasTex(64, 256, (g) => {
  const r = g.createLinearGradient(0, 0, 0, 256); r.addColorStop(0, "rgba(255,226,170,0)"); r.addColorStop(0.35, "rgba(255,226,170,0.55)"); r.addColorStop(1, "rgba(255,226,170,0.0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 256);
  const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, 64, 256);
});
const glowMat = (c: THREE.ColorRepresentation, k = 2.5) => { const m = new THREE.MeshBasicMaterial({ color: c }); m.color.multiplyScalar(k); return m; };
const addGlow = (map: THREE.Texture, k = 1) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(k, k, k), side: THREE.DoubleSide });
const lathe = (pts: [number, number][], m: THREE.Material) => { const l = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20), m); l.castShadow = l.receiveShadow = true; return l; };

const CROWD: Outfit[] = [0, 1, 2, 3, 4, 5].map((v) => ({ ...townsfolk(v), hat: v % 2 ? "cap" : "hair", cap: ["#3f6fb5", "#e0b43c", "#5d7a3a"][v % 3], hair: ["#3a2a20", "#17171c", "#7a4a2a"][v % 3], dress: undefined }));

type Book = { m: THREE.Mesh; x: number; y: number; z: number; d: number };
export class World {
  root = new THREE.Group();
  sets: Record<SetName, THREE.Group> = { hangar: new THREE.Group(), room: new THREE.Group(), stadium: new THREE.Group(), void: new THREE.Group() };
  cast: Cast;
  sun = new THREE.DirectionalLight("#ffffff", 2.6);
  fog = new THREE.Fog("#000", 20, 80);
  // hangar
  screen = new Panel(1300, 700, 13, 7, 1.7);
  button!: THREE.Mesh; plug!: THREE.Mesh; lamps: THREE.Mesh[] = [];
  // room
  king!: THREE.Group; books: Book[] = []; debate = new Panel(1000, 300, 2.0, 0.6, 1.25, true); skill = new Panel(900, 600, 2.25, 1.5, 1.0); lamp!: THREE.Group;
  // stadium
  board = new Panel(960, 440, 9.4, 4.3, 1.6); fear = new Panel(900, 420, 1.9, 0.89, 1.3, true); tapeL!: THREE.Mesh; tapeR!: THREE.Mesh; podium!: THREE.Group;
  // void
  pillars: { g: THREE.Group; p: Panel[] }[] = []; growth = new Panel(1000, 380, 3, 1.14, 1.3, true); choice = new Panel(900, 500, 3.6, 2.0, 1.4, true);
  slit!: THREE.Mesh; door!: THREE.Mesh; beam!: THREE.Mesh; pool!: THREE.Mesh; tiles: { m: THREE.Mesh; z: number }[] = []; doorGlow!: THREE.Mesh;

  constructor() {
    this.root.add(this.sun, this.sun.target);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    for (const s of Object.values(this.sets)) this.root.add(s);
    this.cast = new Cast(this.root);
    this.buildHangar(); this.buildRoom(); this.buildStadium(); this.buildVoid();
  }

  // ---------------- sets ----------------
  private buildHangar() {
    const g = this.sets.hangar;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), lam("#5d6270", tiles)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
    const wall = lam("#2c303b"), rib = lam("#3a3f4d"), dark = lam("#16171c");
    box(g, 44, 18, 0.6, 0, 9, -10.3, wall);
    for (let x = -20; x <= 20; x += 5) if (Math.abs(x) > 7) box(g, 0.6, 18, 0.6, x, 9, -9.9, rib);
    box(g, 0.6, 18, 30, -16, 9, 5, wall); box(g, 0.6, 18, 30, 16, 9, 5, wall);
    box(g, 14.2, 7.8, 0.45, 0, 6.1, -9.75, dark);
    box(g, 0.5, 2.3, 0.5, -4.5, 1.15, -9.6, dark); box(g, 0.5, 2.3, 0.5, 4.5, 1.15, -9.6, dark);
    this.screen.mesh.position.set(0, 6.1, -9.5); g.add(this.screen.mesh);
    // pedestal + the big red button
    cyl(g, 0.2, 0.28, 0.8, 0.62, 0.4, -2.05, lam("#3b3f4b"));
    this.button = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam("#e3262e", undefined, "#4a0406"));
    this.button.position.set(0.62, 0.8, -2.05); this.button.castShadow = true; g.add(this.button);
    // cable from the screen to the junction box (hero pulls the plug in shot 15)
    const curve = new THREE.CatmullRomCurve3([V(6.3, 2.3, -9.55), V(6.0, 0.6, -9.0), V(5.2, 0.07, -7.4), V(4.5, 0.07, -6.0), V(4.4, 0.3, -5.75)]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.07, 8), lam("#1d1d22")); cable.castShadow = true; g.add(cable);
    box(g, 0.62, 0.7, 0.42, 4.45, 0.35, -5.75, lam("#4b5262"));
    this.plug = box(g, 0.2, 0.14, 0.14, 4.1, 0.45, -5.6, lam("#f0c23c"));
    // crates and hanging lamps for depth
    const crate = lam("#7a6a52");
    box(g, 1.4, 1.4, 1.4, -6.5, 0.7, -6.2, crate); box(g, 1.2, 1.2, 1.2, -7.6, 0.6, -4.6, crate); box(g, 1.0, 1.0, 1.0, -6.5, 1.9, -6.2, crate);
    box(g, 1.5, 1.2, 1.3, 8.0, 0.6, -6.8, crate); box(g, 1.1, 0.9, 1.1, 9.3, 0.45, -4.8, crate);
    for (const x of [-4.5, 4.5]) {
      cyl(g, 0.02, 0.02, 6, x, 12, -4, dark, 6);
      const shade = cyl(g, 0.1, 0.7, 0.5, x, 8.8, -4, lam("#23252c"), 20); shade.castShadow = false;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), glowMat("#fff1d0", 4)); bulb.position.set(x, 8.5, -4); g.add(bulb); this.lamps.push(bulb);
    }
  }

  private buildRoom() {
    const g = this.sets.room;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), lam("#9a6a46", planks)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
    const wall = lam("#4a3d55");
    box(g, 16, 6, 0.3, 0, 3, -4.6, wall); box(g, 16, 0.9, 0.36, 0, 0.45, -4.55, lam("#33293d"));
    box(g, 0.3, 6, 12, -6, 3, 1, wall); box(g, 0.3, 6, 12, 6, 3, 1, wall);
    // night window with a moon
    box(g, 1.9, 1.7, 0.2, -3.2, 2.4, -4.45, lam("#2a2230"));
    const win = new Panel(380, 340, 1.6, 1.4, 1.1); win.paint("w", (c, W, H) => {
      const r = c.createLinearGradient(0, 0, 0, H); r.addColorStop(0, "#14244a"); r.addColorStop(1, "#2a4a7e"); c.fillStyle = r; c.fillRect(0, 0, W, H);
      c.fillStyle = "#fff6d8"; c.beginPath(); c.arc(W * 0.7, H * 0.3, 40, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#2a2230"; c.fillRect(W / 2 - 6, 0, 12, H); c.fillRect(0, H / 2 - 6, W, 12);
    });
    win.mesh.position.set(-3.2, 2.4, -4.33); g.add(win.mesh);
    this.skill.mesh.position.set(1.75, 2.2, -4.42); g.add(this.skill.mesh);
    // table + chessboard + pieces
    const wood = lam("#6b4630");
    box(g, 1.3, 0.07, 0.95, 0, 0.76, -1.6, wood);
    for (const [x, z] of [[-0.58, -1.2], [0.58, -1.2], [-0.58, -2.0], [0.58, -2.0]]) box(g, 0.07, 0.74, 0.07, x, 0.37, z, wood);
    const board = canvasTex(256, 256, (c) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? "#3b2a22" : "#efe2c8"; c.fillRect(i * 32, j * 32, 32, 32); } });
    const bd = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.025, 0.64), lam("#ffffff", board)); bd.position.set(0, 0.807, -1.6); bd.receiveShadow = true; g.add(bd);
    const pw = lam("#f2ece0"), pb = lam("#26252b");
    const piece = (m: THREE.Material, h: number) => lathe([[0, 0], [0.032, 0], [0.032, 0.012], [0.018, 0.03], [0.014, h * 0.7], [0.026, h * 0.78], [0.0, h]], m);
    [[-0.2, -1.72, pw, 0.09], [-0.12, -1.5, pw, 0.07], [-0.04, -1.8, pw, 0.12], [0.2, -1.45, pb, 0.07], [0.04, -1.42, pb, 0.09]].forEach(([x, z, m, h]) => {
      const pc = piece(m as THREE.Material, h as number); pc.position.set(x as number, 0.82, z as number); g.add(pc);
    });
    this.king = new THREE.Group(); this.king.position.set(0.12, 0.82, -1.62);
    const k = piece(pb, 0.15); this.king.add(k); box(this.king, 0.012, 0.05, 0.012, 0, 0.17, 0, pb); box(this.king, 0.04, 0.012, 0.012, 0, 0.175, 0, pb);
    g.add(this.king);
    // books on the table (they slide off in shot 10) and a footstool of books
    const bc = ["#c0392b", "#2e86c1", "#d4ac0d", "#27ae60", "#8e44ad", "#e67e22"];
    for (let i = 0; i < 6; i++) {
      const m = box(g, 0.28, 0.07, 0.22, 0.47, 0.83 + i * 0.072, -1.35, lam(bc[i]));
      this.books.push({ m, x: 0.47, y: 0.83 + i * 0.072, z: -1.35, d: i });
    }
    for (let i = 0; i < 4; i++) box(g, 0.42, 0.08, 0.3, -1.05 + (i % 2) * 0.03, 0.04 + i * 0.08, -0.95, lam(bc[(i + 2) % 6]));
    // chair for the study shot
    const ch = lam("#3d2c22");
    box(g, 0.55, 0.06, 0.5, -1.35, 0.46, -1.7, ch); box(g, 0.55, 0.7, 0.06, -1.35, 0.82, -1.95, ch);
    for (const [x, z] of [[-1.58, -1.48], [-1.12, -1.48], [-1.58, -1.92], [-1.12, -1.92]]) box(g, 0.05, 0.46, 0.05, x, 0.23, z, ch);
    // hanging lamp
    this.lamp = new THREE.Group(); this.lamp.position.set(0, 3.6, -1.6);
    cyl(this.lamp, 0.01, 0.01, 1.2, 0, -0.6, 0, lam("#111"), 6);
    const sh = cyl(this.lamp, 0.08, 0.42, 0.32, 0, -1.3, 0, lam("#2a4a3a")); sh.castShadow = false;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), glowMat("#ffe6b0", 4)); bulb.position.set(0, -1.45, 0); this.lamp.add(bulb);
    g.add(this.lamp);
    this.debate.mesh.position.set(0, 2.75, -0.9); g.add(this.debate.mesh);
  }

  private buildStadium() {
    const g = this.sets.stadium;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), lam("#2f5e3c", grass)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
    const tr = new THREE.Mesh(new THREE.PlaneGeometry(120, 4.6), lam("#a8452f", lanes)); tr.rotation.x = -Math.PI / 2; tr.position.set(0, 0.01, 0.9); tr.receiveShadow = true; g.add(tr);
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 4.6), lam("#f6f2ea")); fin.rotation.x = -Math.PI / 2; fin.position.set(0, 0.015, 0.9); g.add(fin);
    const post = lam("#e8e8ee");
    cyl(g, 0.04, 0.04, 1.2, 0, 0.6, -1.5, post, 8); cyl(g, 0.04, 0.04, 1.2, 0, 0.6, 3.3, post, 8);
    const tape = lam("#f4f4f4", undefined, "#202020");
    this.tapeL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 2.4), tape); this.tapeL.geometry.translate(0, 0, 1.2); this.tapeL.position.set(0, 1.08, -1.5); g.add(this.tapeL);
    this.tapeR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 2.4), tape); this.tapeR.geometry.translate(0, 0, -1.2); this.tapeR.position.set(0, 1.08, 3.3); g.add(this.tapeR);
    // stands
    const st = lam("#3a4258"), st2 = lam("#4a536d");
    for (let i = 0; i < 5; i++) box(g, 40, 0.55 * (i + 1), 1.2, 0, 0.275 * (i + 1), -9 - i * 1.2, i % 2 ? st : st2);
    box(g, 40, 0.1, 0.1, 0, 3.4, -8.4, lam("#c9ccd6"));
    // floodlight towers
    for (const x of [-16, 16]) {
      cyl(g, 0.22, 0.32, 16, x, 8, -16, lam("#5a5f6c"), 10);
      box(g, 4.2, 2.6, 0.4, x, 16.2, -15.8, lam("#2a2d36"));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), glowMat("#eef3ff", 5)); b.position.set(x - 1.35 + i * 1.35, 15.65 + j * 1.1, -15.55); b.lookAt(0, 0, 4); g.add(b); }
    }
    // scoreboard
    box(g, 10, 4.9, 0.4, 0, 7.6, -16.6, lam("#1d2029")); box(g, 0.4, 5.5, 0.4, -3.5, 2.6, -16.6, lam("#1d2029")); box(g, 0.4, 5.5, 0.4, 3.5, 2.6, -16.6, lam("#1d2029"));
    this.board.mesh.position.set(0, 7.6, -16.37); g.add(this.board.mesh);
    // podium with a trophy
    this.podium = new THREE.Group(); this.podium.position.set(0, 0, -3);
    const pm = lam("#dcdde6");
    box(this.podium, 1.3, 0.9, 1.1, 0, 0.45, 0, pm); box(this.podium, 1.3, 0.6, 1.1, -1.32, 0.3, 0, pm); box(this.podium, 1.3, 0.4, 1.1, 1.32, 0.2, 0, pm);
    const num = (n: string) => canvasTex(128, 128, (c) => { c.fillStyle = "#dcdde6"; c.fillRect(0, 0, 128, 128); c.fillStyle = "#1d2029"; c.font = "900 96px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n, 64, 70); });
    [["1", 0, 0.45], ["2", -1.32, 0.3], ["3", 1.32, 0.2]].forEach(([n, x, y]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), lam("#ffffff", num(n as string))); p.position.set(x as number, y as number, 0.556); this.podium.add(p); });
    const gold = lam("#f2c14e", undefined, "#3a2a00");
    const cup = lathe([[0, 0], [0.16, 0], [0.16, 0.04], [0.05, 0.08], [0.04, 0.22], [0.16, 0.3], [0.2, 0.5], [0.17, 0.52], [0.0, 0.34]], gold);
    cup.position.set(0.42, 0.9, -0.1); this.podium.add(cup);
    g.add(this.podium);
    this.fear.mesh.position.set(1.15, 2.5, -3.3); g.add(this.fear.mesh);
  }

  private buildVoid() {
    const g = this.sets.void;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), lam("#1b1c24", tiles)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), addGlow(radial("rgba(170,190,255,0.35)", "rgba(0,0,0,0)"), 1)); this.pool.rotation.x = -Math.PI / 2; this.pool.position.y = 0.02; this.pool.layers.set(NOINK); g.add(this.pool);
    for (let i = 0; i < 4; i++) {
      const pg = new THREE.Group(), ps: Panel[] = [];
      for (let s = 0; s < 4; s++) {
        const p = new Panel(256, 1300, 1.05, 6.6, 1.25); p.mesh.position.set(Math.sin((s * Math.PI) / 2) * 0.526, 3.3, Math.cos((s * Math.PI) / 2) * 0.526); p.mesh.rotation.y = (s * Math.PI) / 2;
        pg.add(p.mesh); ps.push(p);
      }
      box(pg, 1.05, 6.6, 1.05, 0, 3.3, 0, lam("#0d1a12")).castShadow = true;
      g.add(pg); this.pillars.push({ g: pg, p: ps });
    }
    this.growth.mesh.position.set(0, 4.3, -0.4); g.add(this.growth.mesh);
    // far slit of light -> the doorway; warm beam; path tiles; choice dial
    this.slit = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 7), glowMat("#ffe2b0", 3)); this.slit.position.set(-0.4, 3.5, -34); g.add(this.slit);
    this.door = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6.4), glowMat("#ffe9c4", 3.5)); this.door.position.set(0, 3.2, -24); g.add(this.door);
    box(g, 0.4, 7.2, 0.4, -1.8, 3.6, -24.05, lam("#141418")); box(g, 0.4, 7.2, 0.4, 1.8, 3.6, -24.05, lam("#141418")); box(g, 4.0, 0.4, 0.4, 0, 7.2, -24.05, lam("#141418"));
    this.doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), addGlow(radial("rgba(255,214,150,0.55)", "rgba(0,0,0,0)"), 1)); this.doorGlow.position.set(0, 3.2, -23.8); this.doorGlow.layers.set(NOINK); g.add(this.doorGlow);
    this.beam = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 16), addGlow(vgrad, 1.4)); this.beam.layers.set(NOINK); g.add(this.beam);
    for (let i = 0; i < 34; i++) {
      const z = 4.3 - i * 0.78;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.62), glowMat("#ffd79a", 1.8)); m.position.set((i % 2 ? 0.12 : -0.12), 0.025, z); m.receiveShadow = true; g.add(m);
      this.tiles.push({ m, z });
    }
    this.choice.mesh.position.set(0, 9.2, -23.6); g.add(this.choice.mesh);
  }

  // ---------------- per frame ----------------
  private sunDir(id: number) {
    const s = SHOTS[id - 1], L = MOODS[s.mood], c = camAt(id, s.a);
    const fwd = V(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize();
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    // az = degrees from the camera's forward axis (0 = backlight, 180 = behind the camera), + toward screen right
    const right = V(-fwd.z, 0, fwd.x);
    const h = fwd.clone().multiplyScalar(Math.cos(az)).addScaledVector(right, Math.sin(az)).normalize();
    return V(h.x * Math.cos(el), Math.sin(el), h.z * Math.cos(el)).normalize();
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = MOODS[s.mood];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 400; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    for (const [k, gr] of Object.entries(this.sets)) gr.visible = k === s.set;
    // light rig: camera-relative key frozen per shot, two-tone uniforms, shadow fit
    const sun = this.sunDir(id);
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const R = THREE.MathUtils.clamp(dist * 1.2 + 6, 9, 40);
    const tgt = s.set === "void" ? V(0, 0, s.id >= 16 ? walkZ(t) : 0) : focus;
    this.sun.position.copy(tgt).addScaledVector(sun, 80); this.sun.target.position.copy(tgt);
    const sc = this.sun.shadow.camera; sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 10; sc.far = 200; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (R / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0, 0, 0); TONE.uSat.value = 1.05;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar; scene.fog = this.fog;
    scene.background = untone(L.bg);
    // canvas angle the key light comes FROM on a card facing the lens
    const right = V().setFromMatrixColumn(cam.matrixWorld, 0);
    const sunScreen = Math.round(Math.atan2(-sun.y, sun.dot(right)) / (Math.PI / 4)) * (Math.PI / 4);

    const people: Person[] = [], cards: FxCard[] = [];
    if (s.set === "hangar") this.hangar(id, t, f, people, cards);
    else if (s.set === "room") this.room(id, t, people, cards);
    else if (s.set === "stadium") this.stadium(id, t, people, cards);
    else this.voidSet(id, t, people, cards);
    this.cast.pose(people, cards, cam, f, sunScreen, L.actorShadow);
    return focus;
  }

  private hangar(id: number, t: number, f: number, P: Person[], C: FxCard[]) {
    paintScreen(this.screen, { t, f, id });
    const pressed = (id === 1 && t > T.slam && t < T.slam + 0.35) || (id === 11 && t > T.lazyPress && t < T.lazyPress + 0.3);
    this.button.scale.y = pressed ? 0.45 : 1;
    const sm = this.screen.mat;
    sm.color.setScalar(id === 15 && t > 46.25 ? 0.2 : 1.7);
    for (const b of this.lamps) (b.material as THREE.MeshBasicMaterial).color.setRGB(id === 11 && t > T.error ? 6 : 4, id === 11 && t > T.error ? 0.6 : 3.8, id === 11 && t > T.error ? 0.6 : 3.3);
    // plug follows the hero's hands after the yank
    if (id === 15 && t > T.yank) { const u = easeOut((t - T.yank) / 0.25); this.plug.position.set(4.1 - 0.55 * u, 0.45 + 0.65 * u, -5.45); this.plug.rotation.z = 1.2 * u; }
    else { this.plug.position.set(4.1, 0.45, -5.6); this.plug.rotation.z = 0; }
    const hero = (front: Person["front"], x = 0.1, z = -1.95, y = 0, extra: Partial<Person> = {}) => P.push({ who: HERO, seed: 3, x, y, z, front, ...extra });
    if (id === 1) {
      const jump = t > 1.6 && t < 3.6 ? 0.28 * Math.abs(Math.sin((t - 1.6) * Math.PI * 1.6)) : 0;
      if (t < 0.3) hero({ expr: "stern", arms: "reach", tilt: -3 });
      else if (t < 1.4) hero({ expr: t < T.slam ? "stern" : "shock", arms: "press", tilt: t < T.slam ? 4 : 0, headTilt: t > T.slam ? -6 : 0 });
      else hero({ expr: "laugh", arms: "cheer" }, 0.1, -1.95, jump);
      if (t > T.slam && t < T.slam + 0.4) { const u = (t - T.slam) / 0.4; C.push({ key: `burst|${Math.round(u * 12)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ff5b4a"), x: 0.62, y: 0.95, z: -1.9, w: 1.3, h: 1.3 }); }
    } else if (id === 2) {
      const up = t > T.coinUp && t < 4.75;
      hero({ expr: t < 4.75 ? "smile" : "grin", arms: t < 4.75 ? "reach" : "cheer" });
      if (up) {
        const u = (t - T.coinUp) / 0.65, y = 1.75 + 1.3 * Math.sin(Math.PI * u), sp = Math.abs(Math.cos(t * 26));
        const k = Math.round(sp * 8) / 8;
        C.push({ key: `coin|${k}`, cw: 200, ch: 200, draw: (p) => { p.ell(100, 100, 6 + 80 * k, 80, "#f2c14e", 8); if (k > 0.5) p.ell(100, 100, 50 * k, 50, null, 5); }, x: 0.55, y, z: -1.8, w: 0.28, h: 0.28 });
      }
    } else if (id === 3) {
      const j = t > T.jump && t < T.jump + 0.55 ? 0.55 * Math.sin((Math.PI * (t - T.jump)) / 0.55) : 0;
      hero({ expr: t < T.jump ? "grin" : "laugh", arms: "cheer" }, 0.1, -1.95, j);
      if (t > 5.9 && t < 6.5) { const u = (t - 5.9) / 0.6; C.push({ key: `burst2|${Math.round(u * 12)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#7dffb0", 12), x: 3.2, y: 5.6, z: -9.2, w: 3, h: 3 }); }
    } else if (id === 4) {
      hero({ expr: "laugh", arms: "cheer" }, 0.1, -1.95, 0.25 * Math.abs(Math.sin(t * 7)));
    } else if (id === 11) {
      const ex = t < T.lazyPress ? "smile" : t < T.error ? "whistle" : t < 28.3 ? "shock" : "nervous";
      hero({ expr: ex, arms: t > T.lazyPress - 0.2 && t < T.error + 0.3 ? "press" : undefined, tilt: t < T.error ? -3 : 0, look: t > 28.3 ? -1 : 0 });
    } else if (id === 15) {
      if (t < 44.9) hero({ expr: t < 43.5 ? "neutral" : "stern" }, 0.4, -2.4);
      else {
        const yank = t > T.yank ? easeOut((t - T.yank) / 0.2) * (1 - ramp(t, T.yank + 0.5, T.yank + 1.2)) : 0;
        hero({ expr: t < T.yank ? "pained" : t < 46.3 ? "shock" : "stern", arms: t < 46.0 ? "pull" : undefined, tilt: t < T.yank ? -5 - 3 * Math.sin(t * 20) * 0.3 : -5 - 12 * yank }, 3.55, -5.3);
        if (t > T.yank && t < T.yank + 0.45) { const u = (t - T.yank) / 0.45; C.push({ key: `sparks|${Math.round(u * 12)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u, "#ffd04a", 9), x: 4.2, y: 0.55, z: -5.5, w: 1.0, h: 1.0 }); }
      }
    }
  }

  private room(id: number, t: number, P: Person[], C: FxCard[]) {
    this.lamp.rotation.z = 0.05 * Math.sin(t * 1.3);
    // king falls on "игру"
    const kf = id === 5 ? clamp01((t - T.kingFalls) / 0.28) : id === 6 || id === 10 ? 1 : 0;
    const bounce = kf >= 1 && id === 5 ? 0.12 * Math.exp(-(t - T.kingFalls - 0.28) * 8) * Math.abs(Math.sin((t - T.kingFalls) * 30)) : 0;
    this.king.rotation.z = -(Math.PI / 2 - 0.08) * easeOut(kf) + bounce; this.king.position.y = 0.82 + 0.02 * kf;
    this.debate.mesh.visible = id === 6;
    if (id === 6) paintDebate(this.debate, 0.5 + 0.5 * ramp(t, 12.0, T.debateWin));
    const u = id === 10 ? ramp(t, T.skill0, T.skill1) : id > 10 ? 1 : 0;
    paintSkill(this.skill, id < 10 ? 0 : u, t);
    for (const b of this.books) {
      const fall = id === 10 ? clamp01((t - T.books - b.d * 0.07) / 0.45) : 0;
      const x = b.x + 0.55 * easeOut(fall) + 0.1 * b.d * fall, y = Math.max(0.035 + 0.07 * (b.d % 3), b.y - 1.6 * fall * fall);
      b.m.position.set(x, y, b.z + 0.1 * Math.sin(b.d) * fall); b.m.rotation.set(0, 0.4 * b.d * fall, -1.4 * fall * (b.d % 2 ? 1 : 0.6));
    }
    if (id === 5) {
      P.push({ who: HERO, seed: 3, x: -0.85, z: -1.4, front: { expr: t < T.kingFalls ? "smile" : "grin", arms: t > 10.5 && t < 11.0 ? "press" : undefined, facing: 1 } });
      P.push({ who: RIVAL, seed: 5, x: 0.9, z: -1.5, front: { expr: t < T.kingFalls ? "stern" : "shock", facing: -1, tilt: t > T.kingFalls ? -4 : 0 } });
    } else if (id === 6) {
      const won = t > T.debateWin;
      const g = Math.floor(t * 3.3) % 2 ? "shrug" : "push";
      P.push({ who: HERO, seed: 3, x: -0.75, z: -0.3, front: { expr: won ? "grin" : "smile", facing: 1, arms: won ? "cheer" : undefined } });
      P.push({ who: RIVAL, seed: 5, x: 0.8, z: -0.35, front: { expr: won ? "nervous" : "stern", facing: -1, arms: won ? undefined : g, tilt: won ? 3 : -3 } });
    } else if (id === 10) {
      P.push({ who: HERO, seed: 3, x: -1.35, y: 0.32, z: -1.55, front: { mode: "sit", expr: t < 24.6 ? "whistle" : "smile", headTilt: 6 }, noBlob: true });
    }
  }

  private stadium(id: number, t: number, P: Person[], C: FxCard[]) {
    this.podium.visible = id === 8; this.fear.mesh.visible = id === 8;
    // finish tape: snaps when the hero hits it (shot 7); whole again in shot 9
    const tb = id === 7 ? clamp01((t - T.cross) / 0.35) : 0;
    this.tapeL.rotation.y = -1.3 * easeOut(tb); this.tapeR.rotation.y = 1.3 * easeOut(tb);
    this.tapeL.visible = this.tapeR.visible = id !== 8;
    if (id === 7) paintBoard(this.board, { kind: "race", time: Math.max(0, Math.min(t, T.cross) - 4.9) });
    else if (id === 8) paintBoard(this.board, { kind: "wins" });
    else paintBoard(this.board, t < T.board ? { kind: "count", n: 3 } : { kind: "winner", k: clamp01((t - T.board) / 0.4) });
    if (id === 8) paintFear(this.fear, 1 - ramp(t, T.fear0, T.fear1));
    // crowd in the stands
    for (let i = 0; i < 16; i++) {
      const row = i % 4, x = -9 + (i * 1.27) % 18 + 0.4 * hh(i), y = 0.55 * (row + 1), z = -9 - row * 1.2;
      const cheer = id === 7 ? t > T.cross - 0.2 : id === 8 ? true : t > T.board && i % 3 === 0;
      const hop = cheer ? 0.12 * Math.abs(Math.sin(t * 6 + i)) : 0;
      P.push({ who: CROWD[i % 6], seed: 11 + i, x, y: y + hop, z, front: { expr: cheer ? (i % 2 ? "laugh" : "grin") : "neutral", arms: cheer ? (i % 3 ? "cheer" : undefined) : undefined, wave: cheer && i % 3 === 0 ? Math.sin(t * 8 + i) : undefined }, noBlob: true });
    }
    if (id === 7) {
      const hx = heroRaceX(t), rx = rivalRaceX(t);
      if (t < T.cross + 0.45) P.push({ who: HERO, seed: 3, x: hx, z: 1.4, side: true, sideOpts: { mode: "march", phase: (t * 2.8) % 1, stride: 1.7, stomp: 1.4, expr: "grin" } });
      else P.push({ who: HERO, seed: 3, x: hx, z: 1.4, front: { expr: "laugh", arms: "cheer" }, y: 0.15 * Math.abs(Math.sin(t * 7)) });
      P.push({ who: RIVAL, seed: 5, x: rx, z: -0.5, side: true, sideOpts: { mode: "march", phase: (t * 2.7 + 0.3) % 1, stride: 1.6, stomp: 1.4, expr: "pained" } });
    } else if (id === 8) {
      P.push({ who: HERO, seed: 3, x: 0, y: 0.9 + 0.12 * Math.abs(Math.sin(t * 5)), z: -2.85, front: { expr: t < T.fear0 ? "laugh" : "grin", arms: "cheer" } });
      P.push({ who: RIVAL, seed: 5, x: -1.32, y: 0.6, z: -2.95, front: { expr: "stern", facing: 1 } });
    } else if (id === 9) {
      const walking = t > 21.3;
      P.push({ who: HERO, seed: 3, x: lazyX(t), z: 1.4, front: { mode: walking ? "stroll" : "stand", phase: (t * 0.9) % 1, expr: t > 20.4 && t < 21.3 ? "whistle" : walking ? "smile" : "neutral", arms: t > 20.5 && t < 21.2 ? "shrug" : undefined, facing: 1 } });
      if (t < 21.0) P.push({ who: RIVAL, seed: 5, x: -11, z: -0.5, front: { expr: "stern", facing: 1 } });
      else if (t < T.rivalFall) P.push({ who: RIVAL, seed: 5, x: sprintX(t), z: -0.5, side: true, sideOpts: { mode: "march", phase: (t * 2.9) % 1, stride: 1.7, stomp: 1.5, expr: "pained" } });
      else {
        const u = clamp01((t - T.rivalFall) / 0.35);
        if (t < 23.2) P.push({ who: RIVAL, seed: 5, x: sprintX(t), y: 0.05 + 0.25 * easeOut(u), z: -0.5, front: { mode: "fall", expr: "pained" }, roll: -1.35 * easeOut(u) });
        else P.push({ who: RIVAL, seed: 5, x: sprintX(t), y: 0.0, z: -0.5, front: { mode: "sit", expr: "stern", facing: 1, look: 1 } });
        if (t > T.rivalFall + 0.3 && t < T.rivalFall + 0.9) { const k = (t - T.rivalFall - 0.3) / 0.6; C.push({ key: `puff|${Math.round(k * 10)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, k, "#e8d8c0", 8, 30, 160), x: sprintX(t) + 0.2, y: 0.3, z: -0.4, w: 1.2, h: 1.2 }); }
      }
    }
  }

  private voidSet(id: number, t: number, P: Person[], C: FxCard[]) {
    const late = id >= 16;
    const R = pillarR(t), py = id === 12 ? pillarY(t) : 0;
    this.pillars.forEach((pl, i) => {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      pl.g.visible = !late;
      pl.g.position.set(Math.cos(a) * R, py, Math.sin(a) * R);
      pl.g.rotation.y = -a;
      for (const p of pl.p) paintPillar(p, id === 14 && t > T.crack ? 1 : 0);
    });
    this.growth.mesh.visible = id === 13 && t > 35.9;
    if (this.growth.mesh.visible) { paintGrowth(this.growth, t); this.growth.mesh.scale.setScalar(easeOut((t - 35.9) / 0.3)); }
    this.pool.visible = !late; this.pool.position.set(0, 0.02, 0);
    (this.pool.material as THREE.MeshBasicMaterial).color.setScalar(id === 14 ? 1 + 1.5 * ramp(t, T.beam, T.beam + 1) : 1);
    this.slit.visible = id >= 12 && id <= 14; this.slit.scale.x = id === 14 ? 1 + 2 * ramp(t, T.beam, T.beam + 1.2) : 1;
    this.door.visible = this.doorGlow.visible = late;
    const white = late ? ramp(t, T.white0, T.white1) : 0;
    (this.door.material as THREE.MeshBasicMaterial).color.set("#ffe9c4").multiplyScalar(3.5 + 30 * white);
    (this.doorGlow.material as THREE.MeshBasicMaterial).color.setScalar(1 + 6 * white);
    this.doorGlow.scale.setScalar(1 + 2.5 * white);
    this.choice.mesh.visible = late;
    if (late) paintChoice(this.choice, t);
    // warm beam from the slit onto the hero (shot 14)
    this.beam.visible = id === 14 && t > T.beam;
    if (this.beam.visible) {
      const k = ramp(t, T.beam, T.beam + 0.8);
      this.beam.position.set(-2.2, 6.2, -4.5); this.beam.rotation.set(0.35, 0, -0.42); this.beam.scale.set(0.3 + 1.2 * k, 1, 1);
      (this.beam.material as THREE.MeshBasicMaterial).color.setScalar(1.4 * k);
    }
    // path tiles appear just before each step
    const hz = walkZ(t);
    for (const tl of this.tiles) {
      const show = late && t > T.firstStep - 0.15 && tl.z > hz - 0.95;
      tl.m.visible = show;
      if (show) { const born = T.firstStep + (5 - (tl.z + 0.95)) / T.walkV; const u = clamp01((t - born) / 0.2); tl.m.scale.set(u, 1, u); }
    }
    const hero = (p: Partial<Person>) => P.push({ who: HERO, seed: 3, x: 0, z: 0, ...p });
    if (id === 12) {
      const look = Math.sin(t * 2.2);
      hero({ front: { expr: t < T.rise0 ? "neutral" : "nervous", facing: look > 0.3 ? 1 : look < -0.3 ? -1 : 0, look: look > 0 ? 1 : -1 } });
    } else if (id === 13) {
      if (t < T.fall) hero({ front: { expr: t < T.close0 ? "nervous" : "pained", arms: t > T.close0 ? "push" : undefined, tilt: t > T.close0 ? 5 * Math.sin(t * 9) : 0 } });
      else {
        const u = clamp01((t - T.fall) / 0.5);
        hero({ x: -1.3 * easeOut(u), y: 0.05 + 0.25 * easeOut(u), front: { mode: "fall", expr: "dazed" }, roll: -1.4 * easeOut(u), z: 0.2 });
        if (t > T.fall + 0.6) { const k = ((t - T.fall) * 0.8) % 1; C.push({ key: `stars|${Math.round(k * 24)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, k), x: 0.35, y: 0.75, z: 0.3, w: 0.9, h: 0.45 }); }
      }
    } else if (id === 14) {
      if (t < T.sit) hero({ x: -1.3, y: 0.3, z: 0.2, front: { mode: "fall", expr: t < T.beam + 0.3 ? "dazed" : "shock" }, roll: -1.4 });
      else if (t < T.stand) hero({ front: { mode: "sit", expr: "shock", look: -1 } });
      else hero({ front: { expr: t < T.reach ? "nervous" : "relief", arms: t > T.reach ? "reach" : undefined, look: -1, facing: -1 } });
    } else {
      // shots 16-17: the walk on the tiles
      if (t < T.firstStep) hero({ z: 5, front: { expr: "nervous", look: -1, tilt: -2 } });
      else hero({ z: hz, side: true, sideOpts: { mode: "march", phase: ((t - T.firstStep) * 0.85) % 1, stride: 0.85, stomp: 0.6, expr: t < 50.2 ? "neutral" : "smile" } });
      if (t > T.rivalIn) {
        const rz = 8.2 - 1.2 * Math.max(0, t - T.rivalIn - 1.2);
        if (t < T.rivalIn + 1.2) P.push({ who: RIVAL, seed: 5, x: -1.0, z: 8.2, front: { expr: "neutral", look: -1 } });
        else P.push({ who: RIVAL, seed: 5, x: -1.0, z: rz, side: true, sideOpts: { mode: "march", phase: ((t - T.rivalIn) * 0.85) % 1, stride: 0.85, stomp: 0.6, expr: "neutral" } });
      }
    }
    void FRIEND; void EXAMINER; void INK; void Pen; void glide;
  }
}
export type { V3 };
