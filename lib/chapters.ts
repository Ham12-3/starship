// The story spine. One chapter = one unit on the Theatre.js sequence.
export type Tier = "A" | "B" | "B+C" | "-";

/** A short line of copy that scrolls past on one side of the picture. */
export interface Beat {
  side: "left" | "right";
  kicker?: string;
  text: string;
}

export interface Chapter {
  id: string; // deep link: /#liftoff
  label: string;
  tier: Tier;
  beats?: Beat[];
}

export const CHAPTERS: Chapter[] = [
  { id: "top", label: "Start", tier: "B" },
  {
    id: "steel",
    label: "Steel",
    tier: "B+C",
    beats: [
      { side: "right", kicker: "The metal", text: "Not carbon fibre. Stainless steel, the same family as a kitchen sink." },
      { side: "left", kicker: "Why steel", text: "It is cheap, it gets stronger in the cold, and it shrugs off heat." },
      { side: "right", kicker: "Rings", text: "Flat sheets are rolled into rings and welded shut, one after another." },
    ],
  },
  {
    id: "stacking",
    label: "Stacking",
    tier: "B",
    beats: [
      { side: "left", kicker: "Ring on ring", text: "The rings are stacked and welded into tanks as tall as a tower block." },
      { side: "right", kicker: "The nose", text: "Last comes the pointed nose, lowered into place by crane." },
    ],
  },
  {
    id: "engines",
    label: "33 engines",
    tier: "B",
    beats: [
      { side: "right", kicker: "Raptor", text: "Every engine burns methane and liquid oxygen." },
      { side: "left", kicker: "Underneath", text: "They are packed into the base of the booster in three rings." },
    ],
  },
  {
    id: "testing",
    label: "Testing",
    tier: "A",
    beats: [
      { side: "left", kicker: "Cold test", text: "First the tanks are filled with freezing liquid nitrogen to prove they hold." },
      { side: "right", kicker: "Static fire", text: "Then the engines are lit for a few seconds while the rocket is held down." },
    ],
  },
  {
    id: "rollout",
    label: "Rollout",
    tier: "B",
    beats: [
      { side: "right", kicker: "Standing up", text: "The rocket travels to the launch pad upright, at walking pace." },
      { side: "left", kicker: "The tower", text: "Waiting for it is a steel tower with two giant arms to lift it into place." },
    ],
  },
  {
    id: "fuelling",
    label: "Fuelling",
    tier: "B",
    beats: [
      { side: "left", kicker: "Very cold fuel", text: "In under an hour the tanks fill with methane and liquid oxygen, colder than minus 160 degrees Celsius." },
      { side: "right", kicker: "The white clouds", text: "Not smoke. Cold gas boiling off, and the air around it turning to mist." },
      { side: "left", kicker: "Frost", text: "The steel gets so cold that ice forms on the outside." },
    ],
  },
  { id: "liftoff", label: "Liftoff", tier: "A" },
  {
    id: "staging",
    label: "Hot staging",
    tier: "A",
    beats: [
      { side: "right", kicker: "T+0:02:21", text: "The ship lights its own engines while it is still sitting on the booster." },
      { side: "left", kicker: "Ring of fire", text: "The blast escapes sideways through a ring of vents between the two stages." },
      { side: "right", kicker: "Separation", text: "Then they let go. The ship keeps climbing. The booster turns for home." },
    ],
  },
  {
    id: "booster-catch",
    label: "The booster comes home",
    tier: "A",
    beats: [
      { side: "left", kicker: "Looking back", text: "A camera on the ship watches the booster fall away towards Earth." },
      { side: "right", kicker: "T+0:06:35", text: "Minutes later the booster flies back to the launch tower, and the tower's arms catch it." },
    ],
  },
  {
    id: "orbit",
    label: "To orbit",
    tier: "B",
    beats: [
      { side: "right", kicker: "Engines off", text: "The ship is now falling around the Earth instead of into it. That is what orbit means." },
      { side: "left", kicker: "Above the air", text: "The thin glowing line is our atmosphere. Above it, the Milky Way." },
    ],
  },
  {
    id: "beyond",
    label: "Out there",
    tier: "B",
    beats: [
      { side: "left", kicker: "Jupiter", text: "The biggest planet. You could fit more than a thousand Earths inside it." },
      { side: "left", kicker: "Saturn", text: "Its rings are made of ice and rock, some pieces as small as dust." },
      { side: "left", kicker: "The Cosmic Cliffs", text: "A cloud of gas and dust in the Carina Nebula, where new stars are being born." },
    ],
  },
  {
    id: "payload",
    label: "Payload",
    tier: "B",
    beats: [
      { side: "right", kicker: "T+0:35:01", text: "A door opens in the side of the ship." },
      { side: "left", kicker: "Starlink", text: "Internet satellites slide out one at a time, like sweets from a dispenser." },
      { side: "right", kicker: "Flight 14", text: "On its first trip to orbit, the ship let out 26 of them." },
    ],
  },
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
  /**
   * Position in chapters, with a fraction: 7.5 is halfway through chapter 7.
   * Measured from the real section positions, so chapters can differ in length.
   */
  chapter: 0,
};
