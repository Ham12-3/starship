# Decisions

Newest first. Each entry: what was chosen and why.

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
| Booster liftoff thrust | ~80.8 MN | ~90.6 MN, shown as "about 90 MN" | Decided by owner, 13 Nov 2026. 33 x 280 tf = 9,240 tf = 90.6 MN |
| Ship height | ~52 m | ~52.1 m (derived) | No official V3 figure found |
| V3 tile count | Unknown | Unknown, stored as null | Do not show a number |
| Starbase buildings | To verify | Starfactory, Mega Bay 1 and 2, Gigabay (under construction, target end 2026) | Confirmed |
| Florida LC-39A | "Planned" | No Starship launch yet, no confirmed date | Keep as "planned" |

**Not done in Phase 0, on purpose.** No post stack, HDRI, atmosphere, audio, or real models. The scene holds only
to-scale stand-ins so scroll, camera and tiers can be tested.
