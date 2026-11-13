// Theatre.js owns every authored camera value. Scroll only moves the playhead.
import { getProject, types, type ISheet } from "@theatre/core";
import state from "@/data/theatre-state.json";
import { SEQUENCE_LENGTH } from "./chapters";

// Kept on globalThis so hot reloads in development reuse the one project.
const cache = globalThis as { __f2oSheet?: ISheet };

export function getSheet(): ISheet {
  return (cache.__f2oSheet ??= getProject("FactoryToOrbit", { state }).sheet("Story"));
}

/**
 * The camera is described the way a camera operator would: where it stands
 * (distance from the pad, height above ground), what it looks at, and which
 * lens is on it (35 mm full-frame equivalent focal length).
 */
export const cameraProps = {
  distance: types.number(900, { range: [5, 20000], nudgeMultiplier: 1 }),
  height: types.number(1.6, { range: [0.2, 500], nudgeMultiplier: 0.1 }),
  bearing: types.number(0, { range: [-180, 180], nudgeMultiplier: 0.5 }),
  pan: types.number(0, { range: [-2000, 2000], nudgeMultiplier: 1 }),
  lookHeight: types.number(62, { range: [0, 400], nudgeMultiplier: 0.5 }),
  focalLength: types.number(200, { range: [14, 2000], nudgeMultiplier: 1 }),
};

export function getCameraObject() {
  return getSheet().object("Camera", cameraProps, { reconfigure: true });
}

/** Move the playhead. `progress` is 0..1 over the whole page. */
export function seek(progress: number) {
  getSheet().sequence.position = Math.min(Math.max(progress, 0), 1) * SEQUENCE_LENGTH;
}

/** Dev only: open the visual editor with `?studio`. Never bundled in production. */
export async function maybeLoadStudio() {
  if (process.env.NODE_ENV !== "development") return;
  if (!new URLSearchParams(location.search).has("studio")) return;
  const studio = (await import("@theatre/studio")).default;
  studio.initialize();
}
