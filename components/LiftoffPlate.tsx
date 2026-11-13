"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, story } from "@/lib/chapters";
import manifest from "@/data/liftoff-plate.json";

/**
 * The launch, as a path-traced image sequence (blender/hero.py, HERO_SEQ)
 * scrubbed by scroll. Frames are loaded only when the reader gets near the
 * chapter, drawn to a canvas, and cross-faded between neighbours so a short
 * sequence still moves smoothly.
 */
const START = CHAPTERS.findIndex((c) => c.id === "liftoff") - 0.75; // fade in before the chapter
const END = START + 2.4; // plays across liftoff and into the next chapter

export default function LiftoffPlate() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const el = wrap.current!;
    const ctx = cv.getContext("2d")!;
    const n = manifest.count;
    if (n === 0) return;
    cv.width = manifest.width;
    cv.height = manifest.height;
    const frames: (HTMLImageElement | null)[] = new Array(n).fill(null);
    let requested = false;
    let raf = 0;
    let lastDrawn = -1;
    let everDrawn = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const load = () => {
      requested = true;
      for (let i = 0; i < n; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = `${manifest.base}${String(i).padStart(3, "0")}.webp`;
        img.onload = () => {
          frames[i] = img;
          lastDrawn = -1; // redraw with the new frame
        };
      }
    };

    const tick = () => {
      const chapter = story.chapter;
      // Start fetching one chapter ahead, never on first paint
      if (!requested && chapter > START - 1.2) load();
      const fade = Math.min(Math.max((chapter - START) / 0.5, 0), 1) * Math.min(Math.max((END + 0.9 - chapter) / 0.5, 0), 1);
      // Never cover the hero with an empty canvas: stay hidden until a frame is drawn
      el.style.opacity = (everDrawn ? fade : 0).toFixed(3);
      if (fade > 0) {
        const u = Math.min(Math.max((chapter - START - 0.35) / (END - START - 0.35), 0), 1);
        // Reduced motion: three stills instead of a scrub
        const pos = reduced ? Math.round(u * 2) * ((n - 1) / 2) : u * (n - 1);
        if (Math.abs(pos - lastDrawn) > 0.01) {
          const a = Math.floor(pos);
          const b = Math.min(a + 1, n - 1);
          const fa = frames[a];
          const fb = frames[b];
          if (fa) {
            ctx.globalAlpha = 1;
            ctx.drawImage(fa, 0, 0, cv.width, cv.height);
            if (fb && b !== a) {
              ctx.globalAlpha = pos - a;
              ctx.drawImage(fb, 0, 0, cv.width, cv.height);
            }
            lastDrawn = pos;
            everDrawn = true;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrap} className="plate liftoff" aria-hidden="true" style={{ opacity: 0 }}>
      <div className="plate-frame" style={{ ["--focus" as string]: 0.63 }}>
        <canvas ref={canvas} />
      </div>
      <div className="plate-grade" />
      <div className="plate-grain" />
    </div>
  );
}
