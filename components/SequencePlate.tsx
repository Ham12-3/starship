"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, story } from "@/lib/chapters";

/**
 * A path-traced image sequence (blender/hero.py) scrubbed by scroll.
 * Frames load only when the reader gets near, and are drawn whole (no
 * blending, which ghosts anything that moves). Space shots are rendered with a
 * transparent background and laid over a real NASA photo, chosen per frame range.
 */
export interface SequenceManifest {
  base: string;
  count: number;
  width: number;
  height: number;
}

interface Props {
  manifest: SequenceManifest;
  /** Chapter id where the sequence starts playing. */
  from: string;
  /** How many chapters it plays across (1 = just that chapter). */
  span?: number;
  /** Backgrounds for transparent frames: each applies up to and including frame `until`. */
  backgrounds?: { until: number; src: string }[];
  /** Where the subject sits across the width, kept in view on narrow screens. */
  focus?: number;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

export default function SequencePlate({ manifest, from, span = 1, backgrounds = [], focus = 0.55 }: Props) {
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
    const first = CHAPTERS.findIndex((c) => c.id === from);
    const start = first - 0.4;
    const end = first + span - 0.03;
    const frames: (HTMLImageElement | null)[] = new Array(n).fill(null);
    const bgs = backgrounds.map((b) => ({ ...b, img: null as HTMLImageElement | null }));
    let requested = false;
    let raf = 0;
    let lastDrawn = -1;
    let everDrawn = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const load = () => {
      requested = true;
      for (const b of bgs) {
        const img = new Image();
        img.src = b.src;
        img.onload = () => {
          b.img = img;
          lastDrawn = -1;
        };
      }
      for (let i = 0; i < n; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = `${manifest.base}${String(i).padStart(3, "0")}.webp`;
        img.onload = () => {
          frames[i] = img;
          lastDrawn = -1;
        };
      }
    };

    const tick = () => {
      const chapter = story.chapter;
      if (!requested && chapter > start - 1.2) load();
      const fade = Math.min(Math.max((chapter - start) / 0.4, 0), 1) * Math.min(Math.max((end + 0.45 - chapter) / 0.4, 0), 1);
      el.style.opacity = (everDrawn ? fade : 0).toFixed(3);
      if (fade > 0) {
        const u = Math.min(Math.max((chapter - first) / (end - first), 0), 1);
        const pos = reduced ? Math.round(Math.round(u * 2) * ((n - 1) / 2)) : Math.round(u * (n - 1));
        if (pos !== lastDrawn) {
          let k = pos;
          while (k > 0 && !frames[k]) k--;
          const img = frames[k];
          const bg = bgs.find((b) => k <= b.until) ?? bgs[bgs.length - 1];
          const bgReady = !bg || bg.img;
          if (img && bgReady) {
            ctx.clearRect(0, 0, cv.width, cv.height);
            if (bg?.img) cover(ctx, bg.img, cv.width, cv.height);
            ctx.drawImage(img, 0, 0, cv.width, cv.height);
            lastDrawn = k === pos ? pos : -1;
            everDrawn = true;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [manifest, from, span, backgrounds]);

  return (
    <div ref={wrap} className="plate seq" aria-hidden="true" style={{ opacity: 0 }}>
      <div className="plate-frame" style={{ ["--focus" as string]: focus }}>
        <canvas ref={canvas} />
      </div>
      <div className="plate-grade" />
      <div className="plate-grain" />
    </div>
  );
}
