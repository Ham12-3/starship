# Realism notes

One short "what makes this look real" note per chapter, written after studying the owner's frames in `/reference/`.
Nothing here is final until reference frames exist: `/reference/` is empty as of 13 Nov 2026.

## Chapter 0: landing page hero (the Phase 1 golden shot)

Working assumptions, to be checked against real frames:

- Long lens (400 mm or more) from a few kilometres away. The stack should look flat and stacked against the tower, not
  tapering away from the camera.
- Haze between camera and pad lifts the blacks and cools the shadows. No pure black anywhere in frame.
- Dusk: sky much brighter than the steel. The rocket reads as a dark, slightly warm shape with one bright edge.
- Vent vapour drifts sideways with the wind and thins out. It never rises straight up.
- The frame is never still: slow breathing, slight heat shimmer near the ground.

Frames needed from the owner for Phase 1:

1. A full stack on the pad at dusk or dawn, shot from far away on a long lens.
2. The same kind of shot with visible venting.
3. A close frame of the steel showing weld seams and the frost line.
4. A frame with the tower arms and something of known size (a truck, people).

### Self-review of the first pass (13 Nov 2026)

Honest status: a convincing mood, not yet a frame that would pass next to a photo.

What works: blue-hour balance of sky against floodlights, haze lifting the blacks, grain, frost bands, lens compression.

Known tells, in rough order of how much they give the shot away:

1. Tower and catch arms are simple boxes. Real ones are dense with pipes, stairs, cable trays and lights.
2. Ground is a flat striped plane. Needs dunes, scrub, a waterline, and soft out-of-focus foreground.
3. No shadows from the floodlights, so the stack does not sit in its light.
4. Steel is too even. Needs dents, panel-to-panel reflection breaks and real weld texture.
5. Vapour is a handful of soft sprites. Reads as haze, not as cold gas rolling off a tank.
6. Sky is a flat gradient with no cloud structure or stars.
7. Lamps have no lens flare or starburst.
8. No people, no moving vehicles, no birds.

### Second pass (13 Nov 2026)

Done from the list above: denser tower (lift core, stairs, pipe bundles, cable trays, platforms, crane jib), truss
catch arms and ship arm, floodlight shadows on the two camera-side masts (Ultra and High tiers), dented steel, dunes
with scrub, utility poles, lagoons, heavier and more varied vapour, lamp glints with diffraction spikes, a blinking
tower beacon and a truck driving the access road.

Still giving it away:

1. Ground strip is plain and the lagoons barely read. Wants a real waterline with reflections of the lit stack.
2. Sky is one smooth gradient: no cloud structure, no stars.
3. Steel reads well on the ship, but the frosted booster is a flat pale column.
4. Vapour is still sprites. Good enough at this distance, not closer.
5. No people. Nothing yet tells the eye how big a person is next to this.
6. Shadows are in but subtle. Needs checking against a real floodlit frame.

Measured in the dev browser pane (800 x 521, small): about 16.6 ms a frame on the WebGL2 path with the full scene.
Not yet measured at full-screen size or on a phone.

### What the official SpaceX Starship page shows (viewed 13 Nov 2026)

Written observations only. No images were saved or copied.

- Dusk frames have a clear vertical gradient: teal above, warm peach on the horizon. Ours was one flat blue. Added an
  afterglow band.
- A fuelled booster really does read as a bright, pale, almost featureless column, and the ship as near-black on its
  tiled side. Our flat pale booster is closer to right than the last self-review said.
- The tower is open lattice all the way up, lit warm, with the catch arms spread wide like a "T" near the top when
  empty. Ours are parked lower, around the booster top.
- Night pad shots mix colour temperatures: orange sodium light over the tank farm, cold white floods on the stack.
  Tank-farm lamps changed to orange.
- Vapour around a loaded stack is heavy and billowing, lit hard by the floods. Ours is still thin.
- Their own site uses a plain studio render of the stack on black for specs. Clean and readable: a good model for the
  comparison chapter.

### Third pass (13 Nov 2026)

- **Water.** A tidal lagoon between camera and pad with a true planar reflection (Ultra and High tiers; a glossy
  plane on the others). It mirrors the sky, the shoreline, buildings and lamps, with slow ripples.
- **Frost.** Each ring on the booster now ices differently, seams show through, and long runs break up the coat.
- **People.** Twelve workers in hi-vis on the pad apron, three of them walking. About nine pixels tall at this
  distance: enough to give the stack its size.
- **Birds.** A line of pelicans crosses low over the water every minute and a half.
- **Framing.** Aim lowered so the waterline is in shot, push-in softened (400 to 455 mm) so the tower top stays in
  frame.

Still giving it away:

1. The reflection of the stack itself is mostly hidden behind the far shore. Worth testing a lower shoreline.
2. Sky still has no cloud structure.
3. Tower, mount and tank farm are still simple shapes up close; fine at this distance, not for any tighter shot.
4. Vapour is still sprites.

Measured in the dev pane (800 x 521) on the WebGL2 path with reflection on: about 16.6 ms a frame. Full-screen and
phone are still unmeasured.

## Owner's reference frames (received 13 Nov 2026)

Saved in `/reference/` (git-ignored, private study only). Owner's verdict on the live hero shot: "not realistic, looks
fake, looks like something that can be easily created." That verdict is right. Why, frame by frame:

- **01 tower and ship (a studio-style render).** This is CG too, and it still reads as real. The difference from ours
  is part count and light. The tower has hundreds of distinct parts: box-section columns, gusset plates at every
  joint, stair flights, handrails, a clad head house, a hook block on cables. The catch arm is a deep welded truss.
  The ship shows individual tile rows. Light is soft and wraps, with contact shadow in every joint. Ours has perhaps a
  twentieth of the parts and no bounce light or occlusion at all.
- **02 and 09 booster catch at dusk (footage).** The subject fills the frame. The camera is a few hundred metres away
  on a drone, not four kilometres away on a telescope. There is a real sea with swell and a soft horizon, real cloud
  flecks, soot streaks and scorch on the booster, a ragged flame with smoke. Nothing is clean.
- **04 engines.** Every bell is different: numbered, discoloured, ribbed, with pipes and wiring. Colour comes from the
  light (magenta and blue glow), not from the paint.
- **03 and 08 orbit.** A thin, bright, blue atmosphere line; sun glare that blows out; cloud decks with real depth;
  hard black shadow side.
- **11 hangar.** Note: this is a Falcon 9 (nine Merlin engines), not Starship. Useful only for factory light: rows of
  high-bay lamps, glossy floor, people and ladders for scale.

Three things make ours look easy to make:

1. **Too few parts.** Shapes built from boxes read as boxes at any distance.
2. **No bounce light.** Real-time direct light with no occlusion makes everything look pasted on.
3. **The subject is small.** A tiny silhouette on a smooth sky looks like a diagram. Every reference fills the frame.

What this means for the plan:

- The hero has to start from a properly modelled stack and tower, lit by a path tracer. That is Phase 2 pulled forward.
- This PC has an Intel Iris Xe (integrated) GPU and an i5-1135G7. It can path-trace stills on the CPU in tens of
  minutes each. It cannot render fluid simulations or long sequences in reasonable time. Sequences need a rented or
  cloud GPU.
- The same GPU is also what the live site was tuned on, so real-time ambitions should stay modest: the live layer adds
  motion (vapour, lights, birds, grain, camera drift) over a path-traced plate rather than drawing the whole picture.
- Move the hero camera in. A drone a few hundred metres out, stack and tower filling the frame, as in frames 01 and 02.
