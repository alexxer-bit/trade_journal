// Формат раскадровки (data/project.json). Полное описание для Claude — reference/project-format.md в плагине.

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export type ThemeName = "pastel" | "dusk" | "night" | "golden";

export type LocationName =
  | "street"
  | "plaza"
  | "cafe"
  | "lab"
  | "room"
  | "office"
  | "park"
  | "stage"
  | "hospital"
  | "studio";

export type ActionName =
  | "idle"
  | "walk"
  | "run"
  | "wave"
  | "point"
  | "cheer"
  | "shrug"
  | "think"
  | "scared"
  | "fall"
  | "lie"
  | "sit"
  | "jump"
  | "talk"
  | "facepalm"
  | "dance"
  | "cry"
  | "angry";

export type FaceName =
  | "neutral"
  | "happy"
  | "grin"
  | "sad"
  | "scared"
  | "angry"
  | "surprised"
  | "sleepy"
  | "smirk"
  | "worried";

export type Facing = number | "camera" | "left" | "right" | "away";

export type HairName = "none" | "puff" | "bob" | "bun" | "cap" | "headband";

export type HeldName = "none" | "phone" | "bottle" | "sign" | "cup" | "coin" | "book";

export type ActorBeat = {
  at: number; // секунды от начала сцены
  action?: ActionName;
  face?: FaceName;
  to?: Vec2; // идти/бежать к точке [x, z]
  facing?: Facing;
  talking?: boolean;
};

export type Actor = {
  id: string;
  x: number;
  z: number;
  shirt?: string;
  pants?: string;
  sleeves?: "long" | "short";
  hair?: HairName;
  hairColor?: string;
  scale?: number;
  held?: HeldName;
  heldText?: string; // текст на табличке (held: "sign")
  print?: "none" | "dino"; // принт на груди футболки
  action?: ActionName;
  face?: FaceName;
  facing?: Facing;
  to?: Vec2;
  talking?: boolean;
  beats?: ActorBeat[];
};

export type PropName =
  | "bottle"
  | "table"
  | "chair"
  | "tree"
  | "car"
  | "sign"
  | "box"
  | "coin"
  | "bench"
  | "lamp"
  | "screen"
  | "bed"
  | "door"
  | "plant"
  | "rock"
  | "clock"
  | "money"
  | "trophy"
  | "syringe"
  | "phone";

export type Prop = {
  type: PropName;
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rotation?: number; // градусы вокруг вертикали
  color?: string;
  label?: string; // надпись/бренд на предмете
  lines?: string[]; // текст для screen / sign
  progress?: ScreenProgress;
};

export type ScreenProgress = {
  label?: string;
  from: number; // 0..100
  to: number; // 0..100
};

export type ScreenSpec = {
  lines: string[];
  progress?: ScreenProgress;
  brand?: boolean; // показать плашку бренда сверху
};

export type ShotName = "wide" | "medium" | "close" | "extreme";

export type CameraMove =
  | "static"
  | "dolly-in"
  | "dolly-out"
  | "pan-left"
  | "pan-right"
  | "orbit"
  | "push"
  | "rise"
  | "shake";

export type CameraSpec = {
  shot?: ShotName;
  target?: string | Vec3; // id актёра или точка
  move?: CameraMove;
  angle?: number; // градусы: 0 — спереди, 90 — справа
  height?: number; // поправка высоты камеры
};

export type TitleSpec = {
  text: string;
  at?: number;
  until?: number;
  position?: "center" | "left" | "right" | "top" | "bottom";
  size?: "big" | "medium" | "small";
};

export type PlateSpec = {
  text?: string; // по умолчанию — бренд
  at?: number;
  position?: "top-left" | "top-right" | "top" | "center";
};

export type SfxSpec = { name: string; at: number; volume?: number };

export type Crowd = {
  count: number;
  area: [number, number, number, number]; // x1, z1, x2, z2
  action?: ActionName;
  face?: FaceName;
  facing?: Facing;
  seed?: number;
  scale?: number; // 0.7 — толпа детей
  avoid?: string[]; // цвета одежды, которых нет в толпе
};

export type SubScene = {
  location?: LocationName;
  bg?: string;
  actors?: Actor[];
  props?: Prop[];
  camera?: CameraSpec;
  label?: string;
};

export type Scene = {
  start: number;
  end: number;
  location?: LocationName;
  time?: "day" | "sunset" | "night";
  bg?: string;
  variant?: number;
  camera?: CameraSpec;
  actors?: Actor[];
  crowd?: Crowd;
  props?: Prop[];
  screen?: ScreenSpec;
  title?: TitleSpec;
  plate?: PlateSpec;
  sfx?: SfxSpec[];
  transition?: "cut" | "fade" | "whip" | "flash";
  split?: { left: SubScene; right: SubScene };
  note?: string; // для себя: что происходит в сцене
};

export type Project = {
  fps: number;
  width: number;
  height: number;
  duration: number; // секунды
  theme: ThemeName;
  letterbox?: boolean;
  subtitles?: boolean;
  brand?: { name: string; color: string; icon?: "ban" | "none" };
  audio: {
    voice: string; // путь внутри public/
    music?: string | null;
    // музыка по главам: каждая часть играет от from до from следующей, переходы плавные
    musicParts?: { from: number; src: string; db?: number; offset?: number }[];
    musicDb?: number;
    sfxDb?: number;
  };
  scenes: Scene[];
};
