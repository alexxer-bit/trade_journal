import * as THREE from "three";

// Общие геометрии и материалы: создаются один раз, поэтому сцены с толпой рендерятся быстро.
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 32, 24),
  sphereLo: new THREE.SphereGeometry(1, 16, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 32),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 24),
  plane: new THREE.PlaneGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 40),
  halfDisc: new THREE.CircleGeometry(1, 32, Math.PI, Math.PI),
  ring: new THREE.TorusGeometry(1, 0.22, 10, 32),
  arc: new THREE.TorusGeometry(1, 0.2, 8, 24, Math.PI),
};

const cache = new Map<string, THREE.Material>();

export const mat = (color: string, opts: { emissive?: boolean; opacity?: number; rough?: number } = {}) => {
  const key = `${color}|${opts.emissive ? 1 : 0}|${opts.opacity ?? 1}|${opts.rough ?? 0.85}`;
  let m = cache.get(key);
  if (!m) {
    if (opts.emissive) {
      m = new THREE.MeshBasicMaterial({ color, transparent: (opts.opacity ?? 1) < 1, opacity: opts.opacity ?? 1 });
    } else {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.rough ?? 0.85,
        metalness: 0,
        transparent: (opts.opacity ?? 1) < 1,
        opacity: opts.opacity ?? 1,
      });
    }
    cache.set(key, m);
  }
  return m;
};

export const shadowMat = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.16, depthWrite: false });

// Чуть темнее/светлее цвета — для крыш, рам, теней на мебели
export const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + k)));
  return `#${c.getHexString()}`;
};
