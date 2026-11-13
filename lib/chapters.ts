// The story spine. One chapter = one unit on the Theatre.js sequence.
export type Tier = "A" | "B" | "B+C" | "-";

export interface Chapter {
  id: string; // deep link: /#liftoff
  label: string;
  tier: Tier;
}

export const CHAPTERS: Chapter[] = [
  { id: "top", label: "Start", tier: "B" },
  { id: "steel", label: "Steel", tier: "B+C" },
  { id: "stacking", label: "Stacking", tier: "B" },
  { id: "engines", label: "33 engines", tier: "B" },
  { id: "testing", label: "Testing", tier: "A" },
  { id: "rollout", label: "Rollout", tier: "B" },
  { id: "fuelling", label: "Fuelling", tier: "B" },
  { id: "liftoff", label: "Liftoff", tier: "A" },
  { id: "staging", label: "Hot staging", tier: "A" },
  { id: "booster-catch", label: "The booster comes home", tier: "A" },
  { id: "orbit", label: "To orbit", tier: "B" },
  { id: "payload", label: "Payload", tier: "B" },
  { id: "re-entry", label: "Re-entry", tier: "A" },
  { id: "catch", label: "Catch", tier: "A" },
  { id: "how-big", label: "How big is big?", tier: "B" },
  { id: "credits", label: "Credits", tier: "-" },
];

export const LAUNCH_CHAPTER = "liftoff";

/** Length of the Theatre sequence in units (one per chapter boundary). */
export const SEQUENCE_LENGTH = CHAPTERS.length - 1;

/**
 * Shared, mutable story clock. Written by the scroll driver, read inside the
 * render loop. Deliberately not React state: it changes every frame.
 */
export const story = {
  /** 0..1 across the whole page */
  progress: 0,
};
