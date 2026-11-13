# Generated plates (Google Flow)

Flow clips are a stand-in for the path-traced Tier A plates until Blender is set up. They cannot be re-rendered from a
script, so every attempt is logged here: input, settings, prompt, verdict. Nothing from this log is on the site yet.

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

## What to change next

- Ask for a steady state: "light, wispy venting, the same amount throughout", and drop "thick".
- Start from a frame that already has the right amount of vapour, so the model continues it rather than inventing it.
- Try a higher-quality model in the same menu for the steel and tower, and compare cost.
- Supply an end frame equal to the start frame so the clip can loop.
