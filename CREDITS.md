# Credits and licences

Every third-party asset, sound and library is logged here before it ships.

## Code libraries

| Library | Licence |
|---|---|
| Next.js, React | MIT |
| three.js, React Three Fiber | MIT |
| Theatre.js core | Apache-2.0 (studio is AGPL-3.0 and is used in development only, never shipped) |
| GSAP | GSAP standard licence (free, including commercial use) |
| Lenis | MIT |

## 3D models, textures, HDRIs

| Asset | Author | Licence | Source |
|---|---|---|---|
| Industrial Sunset (Pure Sky) HDRI, 1k | Poly Haven | CC0 | https://polyhaven.com/a/industrial_sunset_puresky |

All rocket, tower and pad geometry is generated in code for this project (`blender/hero.py`, `components/hero/`).
The hero plate is rendered with Blender (GPL; the licence does not apply to images made with it).

## Audio

The short film's narration and sound are generated with the film itself (see below). No other audio.

## Generated film

| File | What | Made with | Notes |
|---|---|---|---|
| `public/film/factory-to-orbit.mp4`, `poster.webp` | 56-second narrated film, seven 8-second clips | Google Flow, Omni 1.2 Flash, 720p | Text prompts only, no input images. Labelled on the page as an AI-generated illustration. Prompts are in `docs/flow-plates.md`. |

## Imagery

NASA imagery, used under NASA's media guidelines for educational web pages: credited, no NASA logos, no endorsement
implied. Each file in `public/space/` is cropped and re-encoded; nothing else is changed.

| File | NASA ID | What | Credit | Source |
|---|---|---|---|---|
| `limb.webp` | iss071e439624 | Orbital sunrise over Earth's limb (cropped to remove station hardware) | NASA, ISS Expedition 71 | https://images.nasa.gov/details/iss071e439624 |
| `earth-day.webp` | iss072e838362 | Sunrise over the Indian Ocean (cropped to remove station hardware) | NASA, ISS Expedition 72 | https://images.nasa.gov/details/iss072e838362 |
| `milky-way.webp` | iss063e054340 | Milky Way above Earth's airglow (cropped) | NASA, ISS Expedition 63 | https://images.nasa.gov/details/iss063e054340 |
| `carina.webp` | carina_nebula | Webb NIRCam, "Cosmic Cliffs" in the Carina Nebula | NASA, ESA, CSA, STScI | https://images.nasa.gov/details/carina_nebula |
| `saturn.webp` | PIA06193 | Cassini mosaic of Saturn | NASA/JPL/Space Science Institute | https://images.nasa.gov/details/PIA06193 |
| `jupiter.webp` | PIA04866 | Cassini true-colour mosaic of Jupiter | NASA/JPL/Space Science Institute | https://images.nasa.gov/details/PIA04866 |

Rocket images (hero, liftoff, staging, onboard, satellite deploy) are renders made for this site with
`blender/hero.py`. In the space shots the render is laid over the NASA photo listed above. No SpaceX photographs are
used on the site: they are copyrighted. Images the owner supplied are kept in `/reference/` for study only.

## Disclaimer

Independent educational fan project. Not affiliated with or endorsed by SpaceX, NASA, Blue Origin, ESA, CASC or any
agency or company shown. No company or agency logos are used.
