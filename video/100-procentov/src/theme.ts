import type { ThemeName } from "./types";

export type Theme = {
  sky: string;
  fog: string;
  ground: string;
  groundLine: string;
  sidewalk: string;
  road: string;
  walls: string[];
  windows: string;
  windowsLit: boolean;
  roof: string;
  interiorWall: string;
  interiorFloor: string;
  wood: string;
  leaf: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sun: string;
  sunPower: number;
  ambient: number;
  studio: string;
  shirts: string[];
};

// Палитры стилей. Базовый «pastel» повторяет референс: пастельные коробки, мягкий свет.
export const THEMES: Record<ThemeName, Theme> = {
  pastel: {
    sky: "#cfe7f2",
    fog: "#dcebf2",
    ground: "#6dbf72",
    groundLine: "#5aab60",
    sidewalk: "#ddd6cc",
    road: "#5d6170",
    walls: ["#f4b183", "#c9b9f0", "#f7d08a", "#9fd8cf", "#f2a0a0", "#b9d9a8", "#f6c6a8"],
    windows: "#a8d5f2",
    windowsLit: false,
    roof: "#8a7a92",
    interiorWall: "#f3e6da",
    interiorFloor: "#d9c4ab",
    wood: "#b9875a",
    leaf: "#4fae62",
    hemiSky: "#ffffff",
    hemiGround: "#b8a98f",
    hemi: 2.2,
    sun: "#fff1dc",
    sunPower: 2.4,
    ambient: 0.35,
    studio: "#f7c59f",
    shirts: ["#2bb3a3", "#3b7be0", "#ee5b4a", "#f2b632", "#8a5cd8", "#e86aa6", "#4cb35a", "#ff8a3d"],
  },
  dusk: {
    sky: "#f3a37a",
    fog: "#e9a88a",
    ground: "#5a9a68",
    groundLine: "#4c8a5b",
    sidewalk: "#cdb7a8",
    road: "#4d4a5c",
    walls: ["#e48b6b", "#a98bd0", "#e6b26c", "#7fbcb3", "#d97b86", "#9fbf8a"],
    windows: "#ffd59a",
    windowsLit: true,
    roof: "#6a5470",
    interiorWall: "#efd2c0",
    interiorFloor: "#c9a688",
    wood: "#a8754e",
    leaf: "#3f9356",
    hemiSky: "#ffd2b8",
    hemiGround: "#7a5a5a",
    hemi: 1.8,
    sun: "#ffb27a",
    sunPower: 2.6,
    ambient: 0.3,
    studio: "#f0a585",
    shirts: ["#2bb3a3", "#3b7be0", "#ee5b4a", "#f2b632", "#8a5cd8", "#e86aa6", "#4cb35a", "#ff8a3d"],
  },
  night: {
    sky: "#1d2444",
    fog: "#232b4d",
    ground: "#2f5a45",
    groundLine: "#294f3d",
    sidewalk: "#5a5d72",
    road: "#2b2d3a",
    walls: ["#3d4370", "#4e417a", "#2f5f70", "#5a3f66", "#3e5a78"],
    windows: "#ffd27a",
    windowsLit: true,
    roof: "#23253a",
    interiorWall: "#3c4066",
    interiorFloor: "#4a4256",
    wood: "#6e5240",
    leaf: "#2c6b48",
    hemiSky: "#8fa2ff",
    hemiGround: "#2a2540",
    hemi: 1.1,
    sun: "#b9c8ff",
    sunPower: 1.4,
    ambient: 0.35,
    studio: "#2e3560",
    shirts: ["#2bb3a3", "#3b7be0", "#ee5b4a", "#f2b632", "#8a5cd8", "#e86aa6", "#4cb35a", "#ff8a3d"],
  },
  golden: {
    sky: "#f6d68f",
    fog: "#f3dca5",
    ground: "#8cbf5e",
    groundLine: "#7caf52",
    sidewalk: "#e6d3b0",
    road: "#6b6255",
    walls: ["#f0a868", "#e8c66d", "#d99a7a", "#b8c98a", "#e8b49a", "#c9a7d6"],
    windows: "#bfe0f0",
    windowsLit: false,
    roof: "#8a6a52",
    interiorWall: "#f5e3c8",
    interiorFloor: "#d6b58a",
    wood: "#b8834f",
    leaf: "#6aa84f",
    hemiSky: "#fff3d0",
    hemiGround: "#b08a5a",
    hemi: 2.0,
    sun: "#ffd89a",
    sunPower: 2.8,
    ambient: 0.3,
    studio: "#f3c27a",
    shirts: ["#2bb3a3", "#3b7be0", "#ee5b4a", "#f2b632", "#8a5cd8", "#e86aa6", "#4cb35a", "#ff8a3d"],
  },
};

export const BLACK = "#151515";
export const WHITE = "#ffffff";
