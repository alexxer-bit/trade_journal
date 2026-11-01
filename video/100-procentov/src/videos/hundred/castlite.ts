// Our flat cast as lit cards in the 3D world (the bridge skill's cast.ts, cut down to what «100%» needs):
// one canvas per distinct drawing (Pool), yaw-only billboards shaded by cardShade(), contact blobs, unlit fx cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, Outfit, FrontOpts, SideOpts } from "./toon";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind(kind: "cut" | "soft" | "blob", glow = 1) {
    const t = this.r?.tex;
    if (!t) return;
    if (kind === "blob") {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else {
      const m = kind === "soft" ? this.soft : this.mat;
      m.map = t; m.color.setScalar(glow); this.mesh.material = m; this.mesh.renderOrder = kind === "soft" ? 2 : 0;
    }
  }
}

// ---------------- what the story asks for ----------------
/** one character this frame. view: front (billboard toward the lens) or side (walking/running past). */
export type Person = {
  who: Outfit; seed: number; x: number; y?: number; z: number; scale?: number;
  side?: boolean; mirror?: boolean; front?: FrontOpts; sideOpts?: SideOpts; roll?: number; noBlob?: boolean;
};
export type FxCard = {
  key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number;
  flat?: boolean; rot?: number; kind?: "cut" | "soft" | "blob"; glow?: number;
};
const q = (v: number, n = 60) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] => (d < 3.2 ? [1200, 2000, 2.0] : d < 7 ? [780, 1300, 1.3] : d < 16 ? [420, 700, 0.7] : [240, 400, 0.4]);

/** blinks: 4-frame lid closes every 0.5-2.3 s, different per seed */
const LID = [0.5, 1, 1, 0.5];
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
export const lidAt = (f: number, seed: number) => {
  let s = Math.round(-60 * hh(seed, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(seed * 31 + n, 13));
  }
  return 0;
};

const contactKey = "blob|contact|#3a3550";
export class Cast {
  pool = new Pool();
  actors: Actor[] = [];
  fxs: Fx[] = [];
  constructor(private parent: THREE.Object3D) {}
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.parent)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.parent)); return this.fxs[i]; }

  /** place everyone for this frame. sunScreen = canvas angle the key light comes FROM (painted crescent side). */
  pose(people: Person[], cards: FxCard[], cam: THREE.PerspectiveCamera, f: number, sunScreen: number, castShadow: boolean) {
    const used: { a: Actor }[] = [];
    let ai = 0;
    const all = [...cards];
    for (const p of people) {
      const sc = p.scale ?? 1, y = p.y ?? 0;
      const d = cam.position.distanceTo(new THREE.Vector3(p.x, y + 1.2, p.z)) / sc;
      const [w, h, k] = tier(d);
      const blink = lidAt(f, p.seed);
      const light = p.side && p.mirror ? Math.PI - sunScreen : sunScreen;
      let key: string, draw: (pen: Pen) => void;
      if (p.side) {
        const so: SideOpts = { ...(p.sideOpts ?? {}), light, seed: p.seed, blink };
        key = `S|${p.seed}|${fkey(so)}`; draw = (pen) => bodySide(pen, p.who, so);
      } else {
        const fo: FrontOpts = { mode: "stand", ...(p.front ?? {}), light, seed: p.seed, blink };
        key = `F|${p.seed}|${fkey(fo)}`; draw = (pen) => bodyFront(pen, p.who, fo);
      }
      const a = this.actor(ai++);
      a.r = this.pool.req(key, w, h, k, draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.side && p.mirror ? -sc : sc, sc, sc);
      a.mesh.castShadow = castShadow;
      used.push({ a });
      if (!p.noBlob) all.push({ key: contactKey, cw: 128, ch: 128, draw: (pen) => fxContact(pen, "#3a3550"), x: p.x, y: y + 0.02, z: p.z, w: 0.62 * sc, h: 0.42 * sc, flat: true, kind: "blob" });
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    const fused: { e: Fx; c: FxCard }[] = [];
    let fi = 0;
    for (const c of all) {
      const e = this.fx(fi++);
      e.r = this.pool.req(c.key, c.cw, c.ch, 1, c.draw);
      e.mesh.visible = true;
      e.mesh.position.set(c.x, c.y, c.z);
      if (c.flat) e.mesh.rotation.set(-Math.PI / 2, 0, c.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(c.rot ?? 0); }
      e.mesh.scale.set(c.w, c.h, 1);
      fused.push({ e, c });
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const { a } of used) a.bind();
    for (const { e, c } of fused) e.bind(c.kind ?? "cut", c.glow ?? 1);
  }
}
