# Offline renders (Blender, Cycles)

Every plate on the site is produced by a script in this folder, so it can be re-rendered from scratch.

## Hero plate

```
powershell -File blender/render.ps1 -Name hero      # renders blender/out/hero.png
node scripts/make-plates.mjs hero                   # writes public/plates/hero.webp and hero-1280.webp
```

`render.ps1` reads settings from environment variables. The published plate used:

| Variable | Value | Meaning |
|---|---|---|
| `HERO_W`, `HERO_H` | 2560, 1440 | Output size |
| `HERO_SPP` | 96 | Samples per pixel (with denoising) |
| `HERO_VAPOUR` | 0.3 | Vapour density |
| `HERO_FLOOD` | 5000000 | Floodlight power, watts |

Other dials (defaults in `hero.py`): `HERO_EXPOSURE`, `HERO_SKY` (sky rotation, degrees), `HERO_SKY_STRENGTH`,
`HERO_LENS`, `HERO_CX/CY/CZ` (camera position), `HERO_TX/TZ` (aim point), `HERO_LAMP`, `HERO_SAVE_BLEND=1` to keep
the `.blend` file.

A quick test: `HERO_W=1280 HERO_H=720 HERO_SPP=24` takes about a minute. The full plate took about six minutes on a
4-core laptop CPU (i5-1135G7), with no GPU.

## Inputs

- `data/rockets.json` for every dimension.
- `blender/assets/industrial_sunset_puresky_4k.hdr` (Poly Haven, CC0, 16 MB, not in git). Download from
  https://polyhaven.com/a/industrial_sunset_puresky. Without it the script falls back to the 1k copy in `public/hdri`.

## Notes

- Tested with Blender 5.3. The Microsoft Store build can only be started through `blender-launcher.exe`, which
  detaches, so the script writes `out/<name>.log` and `out/<name>.done` and `render.ps1` waits for them.
- `out/` is git-ignored.
