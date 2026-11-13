# Decisions

Newest first. Each entry: what was chosen and why.

## Hero moved to a path-traced plate (13 Nov 2026)

**Why.** The owner judged the live hero shot fake, and the reference frames showed why: too few parts, no bounce
light, subject too small. Three passes of real-time polish and three Google Flow clips did not change that.

**What.** `blender/hero.py` builds the stack, tower, catch arms, mount, tank farm, people and vapour from
`rockets.json` and path-traces one frame in Cycles: drone camera 365 m out, 42 mm lens, sun behind the pad, real
captured sky at 4k. About 107,000 faces before bevels. The site shows that frame (`components/HeroPlate.tsx`) with a
thin live layer: drifting vapour, blinking beacon, grain refreshed 24 times a second, slow push-in on scroll.

**The live 3D scene is off by default.** It is still there behind `/?live` for the interactive chapters to come. This
also takes the load off weak GPUs: the dev machine has integrated Intel graphics.

**Limits of this route on this machine.** Stills render in minutes on the CPU. Fire, smoke and steam simulations and
long sequences do not; those need a cloud GPU. The live layer is 2D, so the camera cannot move far.

**Not from sources:** tower and mount shapes are generic, inspired by the references, not measured.

## Phase 1, first look-dev pass (13 Nov 2026)

**Route: real-time first (Tier B).** Blender is not installed and there are no reference frames yet, so the hero shot
starts as a real-time scene. If it cannot pass the 5-person test it becomes a path-traced loop (Tier A) using the same
camera and grade.

**The shot.** Long lens, 400 mm pushing to 520 mm on scroll, 4 km from the pad, camera 3 m above the ground, blue hour.
At that distance the rocket is about 0.2 m per pixel, so the look depends on light, haze and lens behaviour far more
than on model detail.

**Sky.** Poly Haven "Industrial Sunset (Pure Sky)" at 1k (1.1 MB, CC0) for both lighting and backdrop. A long lens only
sees a few degrees of sky, so a soft gradient is correct and the small file is enough. Rotated so the afterglow is off
to one side: blue sky behind the stack, warm rim light on the tanks.

**Models are procedural stand-ins** (`components/hero/builders.ts`), sized from `rockets.json`: welded steel rings,
frost on the loaded tanks, heat tint above the engines, hot-staging ring, three grid fins, heat-shield half, flaps,
lattice tower with catch arms, launch mount, tank farm, light masts, trucks. Phase 2 replaces them.
Unverified guesses: grid fins 90 degrees apart with none on the tower side; launch mount height 12 m; tower 146 m.

**Post stack** (`components/Post.tsx`, TSL, same code on WebGPU and WebGL2): heat shimmer, lateral chromatic
aberration, bloom from bright sources only, vignette, AgX tonemap, grade (lower saturation, warm highlights, cool
shadows, lifted blacks), luminance grain refreshed 24 times a second. Not yet in: depth of field, motion blur, AO,
LUT file, 24 fps cadence.

**Camera.** Added `pan` to the Theatre camera so the stack sits right of the headline and re-centres on the push-in.
The mount drifts and trembles slightly, scaled by angle so it reads the same on any lens.

**Headline changed at the owner's request:** "Taller than the Statue of Liberty" (93 m with pedestal) replaces the
Big Ben line, with feet first and metres second. The comparison chapter should follow suit in Phase 3 (US references
such as a school bus instead of a London bus): to confirm with the owner.

## Phase 0 (13 Nov 2026)

**Stack versions.** Next.js 16 (App Router, `output: "export"`), React 19, three.js r187, React Three Fiber 9,
Theatre.js 0.7, GSAP 3 + ScrollTrigger, Lenis. TypeScript pinned to 5.x: TypeScript 7 (the native compiler) is out, but
Next's build integration is safer on 5 for now.

**Renderer.** `WebGPURenderer` from `three/webgpu`, created through R3F's async `gl` factory. It falls back to WebGL2
on its own when WebGPU is missing. `?webgl` forces the fallback for testing. Tonemapping is AgX from day one so nothing
is ever judged under the wrong curve.

**No drei yet.** Nothing in Phase 0 needs it, and parts of drei still assume `WebGLRenderer`. Add helpers one at a time
when a chapter needs them, and test each on the WebGPU path.

**Splats: `GaussianSplat`, not `GaussianSplatMesh`.** The brief's class name was the pre-release name. In r186+ the
class is `GaussianSplat` (`three/addons/objects/GaussianSplat.js`) and works only with `WebGPURenderer` (including its
WebGL2 mode). It has no LOD or streaming, so large captured environments should use Spark. Decide per scene in Phase 4.

**Quality tiers.** Own heuristic (WebGPU present, touch + small screen, cores, memory) plus a real one-second benchmark
of the live scene. No `detect-gpu`: it downloads benchmark tables from a third-party CDN at runtime. The benchmark only
ever demotes, uses the median frame time, and ignores hidden-tab frames. `?tier=ultra|high|medium|mobile` pins a tier.
Dynamic resolution then holds the frame rate inside the tier's pixel-ratio range.

**Camera described like a real camera.** Theatre.js animates `distance`, `height`, `bearing`, `lookHeight` and
`focalLength` (mm, 36 mm full-frame sensor). The rig converts focal length to field of view. This keeps every shot
honest about which lens a crew would have used (Realism Bible 4.3).

**Scroll.** One section per chapter. ScrollTrigger turns page progress into `story.progress`; the render loop moves the
Theatre playhead (one sequence unit per chapter). `story` is a plain mutable object, not React state, because it
changes every frame. Lenis is off under `prefers-reduced-motion`.

**Theatre state.** `data/theatre-state.json` is hand-written placeholder keyframes for Phase 0. From Phase 1, author in
the studio (`npm run dev`, open `/?studio`) and export over this file. The studio is never bundled in production.

**Data.** `data/rockets.json` is the single source for every number. Each fact carries `value`, `unit`, `source`,
`asOf`, and `verified`. `npm run check:data` validates against `rockets.schema.json`, runs cross-checks, lists
unverified facts, and runs before every build.

**Facts changed from the brief after re-checking.**

| Item | Brief | Now | Status |
|---|---|---|---|
| Flight 15 outcome | Unknown | Not launched yet at time of check (NET 22:45 UTC, 13 Nov) | Re-check after 14 Nov |
| Booster liftoff thrust | ~80.8 MN | ~90.6 MN, shown as "about 90 MN" | Decided by owner, 13 Nov 2026, and kept after seeing that the official SpaceX page lists 8,240 tf (80.8 MN). Sources drawer to show both |
| Ship height | ~52 m | ~52.1 m (derived) | No official V3 figure found |
| V3 tile count | Unknown | Unknown, stored as null | Do not show a number |
| Starbase buildings | To verify | Starfactory, Mega Bay 1 and 2, Gigabay (under construction, target end 2026) | Confirmed |
| Florida LC-39A | "Planned" | No Starship launch yet, no confirmed date | Keep as "planned" |

**Not done in Phase 0, on purpose.** No post stack, HDRI, atmosphere, audio, or real models. The scene holds only
to-scale stand-ins so scroll, camera and tiers can be tested.
