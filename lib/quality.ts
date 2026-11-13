// Quality tiers: a first guess from device hints, then corrected by a real
// 1-second benchmark of the live scene. Later phases read `settings` to decide
// which post passes, splats and plates to load.

export type TierName = "ultra" | "high" | "medium" | "mobile";

export interface TierSettings {
  /** Upper and lower bounds for dynamic resolution scaling. */
  dprMax: number;
  dprMin: number;
  targetFps: number;
  /** Feature switches consumed from Phase 1 onward. */
  post: { ao: boolean; dof: boolean; motionBlur: boolean; bloom: boolean; grain: boolean };
  splats: boolean;
  /** Mobile plays Tier A video for most chapters instead of real-time. */
  preferPlates: boolean;
}

export const TIERS: Record<TierName, TierSettings> = {
  ultra: { dprMax: 2, dprMin: 1, targetFps: 60, post: { ao: true, dof: true, motionBlur: true, bloom: true, grain: true }, splats: true, preferPlates: false },
  high: { dprMax: 1.5, dprMin: 0.85, targetFps: 60, post: { ao: true, dof: true, motionBlur: false, bloom: true, grain: true }, splats: true, preferPlates: false },
  medium: { dprMax: 1.25, dprMin: 0.6, targetFps: 60, post: { ao: false, dof: false, motionBlur: false, bloom: true, grain: true }, splats: false, preferPlates: false },
  mobile: { dprMax: 1.5, dprMin: 0.6, targetFps: 30, post: { ao: false, dof: false, motionBlur: false, bloom: false, grain: true }, splats: false, preferPlates: true },
};

const ORDER: TierName[] = ["ultra", "high", "medium", "mobile"];

export interface DeviceHints {
  webgpu: boolean;
  touch: boolean;
  cores: number;
  memoryGb: number | undefined;
}

export function readHints(): DeviceHints {
  const nav = navigator as Navigator & { gpu?: unknown; deviceMemory?: number };
  return {
    webgpu: !!nav.gpu,
    touch: matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 900,
    cores: nav.hardwareConcurrency ?? 4,
    memoryGb: nav.deviceMemory,
  };
}

/** `?tier=high` pins a tier and skips the benchmark (for testing and screenshots). */
export function tierOverride(): TierName | null {
  const t = new URLSearchParams(location.search).get("tier");
  return ORDER.includes(t as TierName) ? (t as TierName) : null;
}

export function guessTier(h: DeviceHints): TierName {
  if (h.touch) return "mobile";
  const weak = h.cores <= 4 || (h.memoryGb !== undefined && h.memoryGb <= 4);
  if (weak) return "medium";
  return h.webgpu ? "ultra" : "high";
}

/**
 * Correct the guess with measured frame times (ms) from about one second of
 * rendering. Uses the median so one slow frame (shader compile, GC) is ignored.
 * Never promotes: an idle scene always looks fast.
 */
export function refineTier(guess: TierName, frameTimesMs: number[]): TierName {
  if (frameTimesMs.length < 10) return guess;
  const sorted = [...frameTimesMs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const budget = 1000 / TIERS[guess].targetFps;
  const drop = median > budget * 2.2 ? 2 : median > budget * 1.3 ? 1 : 0;
  // "mobile" is a device class, not just a speed class: desktops stop at medium.
  const floor = guess === "mobile" ? 3 : 2;
  return ORDER[Math.min(ORDER.indexOf(guess) + drop, floor)];
}
