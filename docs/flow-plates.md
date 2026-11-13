# Generated plates (Google Flow)

Flow clips are a stand-in for the path-traced Tier A plates until Blender is set up. They cannot be re-rendered from a
script, so every attempt is logged here: input, settings, prompt, verdict. The three plate attempts below are not on the site. The film at the end of this file is: its frames are the page's picture.

Rules:

- Inputs are our own renders only. No third-party photos (brief, section 9).
- Capture the start frame from the site with `/?clean` (hides all overlays).
- Flow project: "Nov 13 - 09:58" on the owner's account.

## Clip 1: text only (13 Nov 2026)

- Model: Omni 1.2 Flash, 720p, 8 s, 16:9, 1 output, 24 credits. No input image.
- Prompt (summary): documentary telephoto shot of a tall stainless steel two-stage rocket beside a lattice tower with
  catch arms at blue hour, venting vapour, floodlights, teal-to-peach sky, no launch, no people, no text.
- Verdict: **rejected.** Light, vapour and sky look filmed. The rocket is the wrong shape (short, stubby), the framing
  is wide-angle, and the steam at the base reads like an engine test.

## Clip 2: from our render (13 Nov 2026)

- Model: Omni 1.2 Flash, 720p, 8 s, 16:9, 1 output, 24 credits. Frames mode.
- Start frame: `blender/out/hero_start.jpg`, captured from `/?clean&tier=ultra#steel` at 1568 x 749. Flow cropped it
  to 16:9.
- Prompt: "Turn this exact frame into real telephoto documentary footage. Keep the rocket, the launch tower, the catch
  arms, the light masts and the composition exactly as they are: same shapes, same proportions, same positions, nothing
  added or removed. Locked-off 500mm lens from four kilometres away, blue hour. Add what a real camera would see: thick
  cold white vapour venting from the side of the rocket and rolling slowly along the base, drifting to the right in a
  light breeze and lit by the floodlights; real weathered stainless steel with weld seams and frost; a dense, detailed
  steel lattice tower; soft atmospheric haze and gentle heat shimmer; natural sensor grain; a tiny slow camera drift.
  The red beacon on top of the tower blinks slowly. The rocket stays on the pad and does not launch. No flames, no
  people, no text, no logos. Photorealistic, natural colour."
- Verdict: **not usable yet, but the method works.** Shapes, proportions and positions are held exactly, which was the
  point. Problems: the vapour grows from almost nothing to huge billowing clouds over the 8 seconds, far more than a
  stack sitting on the pad, so it cannot loop and it reads as staged. The steel and tower were barely changed, so they
  still look rendered. 720p is soft for a full-screen hero.

## Clip 3: from our render, start and end frame the same (13 Nov 2026)

- Model: Omni 1.2 Flash, 720p, 8 s, 16:9, 1 output, 24 credits. Frames mode, same image as start and end.
- Prompt: "A calm, steady, seamless loop of real telephoto documentary footage. The first and last frame are identical.
  Keep the rocket, launch tower, catch arms, light masts, ground and sky exactly as in the frame: same shapes,
  proportions and positions, nothing added, removed or redrawn. Locked-off 500mm lens from four kilometres away at blue
  hour. Very little happens: only a few thin, faint wisps of cold vapour drift slowly to the right from the side of the
  rocket and from its base, the same small amount from the first second to the last, never growing, never forming
  clouds or billows. Soft atmospheric haze, very gentle heat shimmer near the ground, fine natural sensor grain, an
  almost invisible slow camera drift. The red light on top of the tower blinks slowly. The rocket stays on the pad and
  does not launch. No smoke clouds, no steam plumes, no flames, no people, no text, no logos. Photorealistic, natural
  colour."
- Verdict: **loops and behaves, but adds nothing.** Checked at 0:00 and 7:19 (the middle of the clip was not
  inspected: the page stopped responding). The vapour stays small and the last frame matches the first, so it would
  loop. But the picture is our render almost unchanged: same simple tower, same flat steel. It is no more convincing
  than the live scene, at lower resolution.

## What the three clips show

The model trades accuracy against realism. Left free (clip 1) it makes footage that looks filmed but gets the rocket
wrong. Pinned to our frame (clips 2 and 3) it keeps the rocket right and keeps the rendered look too. It will not
turn a simple render into a photo while holding every shape.

So Flow is not a shortcut around a better model. Where it can still help:

- Shots where the rocket is small, far away or hidden: steam clouds, sky, crowd, sea, launch-day atmosphere.
- Vapour, steam and smoke elements to layer over the live scene, generated on plain backgrounds.
- Later, starting from a much better frame (the Phase 2 Blender model, path-traced), where there is less for the model
  to fix.

## The film (13 Nov 2026): on the site, as scroll-scrubbed frames

At the owner's request the film replaces the rendered model as the page's picture. It is split into frames and
scrubbed by scroll (`components/FilmScroll.tsx`, `data/film-plate.json`). The Blender plates, NASA photo chapters and
their components stay in the repo but are not rendered. This sets aside the "our own renders only" rule above.

- Flow project: "Nov 13 - 17:04". Scene: "Untitled Scene 11-13 17:07:39".
- Model: Omni 1.2 Flash, 720p, 8 s, 16:9, 1 output each, text only. Seven clips, 168 credits.
- Every prompt ends: "Photoreal, cinematic, anamorphic lens, natural film grain, no on-screen text, no subtitles. A
  calm, deep documentary narrator says in voice-over: "..."". The seven shot descriptions are in `higgsfield/shots.md`
  (written for Higgsfield first; that account had no credits, so Flow was used). The narration is not used: frames
  have no sound.
- Frames: `ffmpeg -i <export>.mp4 -vf "fps=10,scale=960:540:flags=lanczos" -c:v libwebp -quality 62
  public/plates/film/%03d.webp`. 560 frames, 12 MB. Only frames near the playhead are loaded.
- Shots are pinned to chapters in `data/film-plate.json`: factory (top to testing), rollout, pad (fuelling), engines
  and climb (liftoff to booster catch), space (orbit, beyond), satellites (payload). Later chapters hold the last
  frame, dimmed.
- Known gaps: there is no footage of hot staging, the booster catch, re-entry or the ship catch, so that copy sits
  over other shots. The rocket's shape differs from shot to shot; the engine shot does not show 33 engines; planets
  are shown in a line.
