# Factory to Orbit

A scroll-driven 3D story of a rocket, from the factory floor to orbit and back.

```
npm install
npm run dev          # http://localhost:3000
npm run check:data   # schema check for data/rockets.json
npm run build        # static site in /out
```

Useful URLs in development:

- `/?live` shows the real-time 3D scene instead of the rendered hero plate
- `/?studio` opens the Theatre.js editor for camera keyframes
- `/?webgl` forces the WebGL2 fallback
- `/?tier=ultra|high|medium|mobile` pins a quality tier
- `/#liftoff` deep-links to a chapter (ids are in `lib/chapters.ts`)

Where things live:

- `data/rockets.json`: every number shown on the site, with source and date
- `lib/`: chapters, quality tiers, Theatre.js timeline
- `components/`: 3D stage (`Experience`, `Scene`) and scroll story (`Story`)
- `docs/decisions.md`, `docs/realism-notes.md`: why things are the way they are
- `blender/`: reproducible offline render scripts (from Phase 1)
- `reference/`: private reference frames, git-ignored
