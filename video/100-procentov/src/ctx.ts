import { createContext, useContext } from "react";
import type { Theme } from "./theme";
import { THEMES } from "./theme";
import type { Project } from "./types";

export type Ctx = { project: Project; theme: Theme; brandColor: string; brandName: string };

export const ProjectCtx = createContext<Ctx>({
  project: null as unknown as Project,
  theme: THEMES.pastel,
  brandColor: "#2bb3b1",
  brandName: "",
});

export const useCtx = () => useContext(ProjectCtx);
