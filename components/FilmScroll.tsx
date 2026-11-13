"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, story } from "@/lib/chapters";

/**
 * The whole page's picture: the Flow film split into frames and scrubbed by
 * scroll. Scrolling down plays it forwards, scrolling up plays it backwards.
 *
 * `anchors` pin chapters to frames, so each shot lines up with its chapter
 * even though chapters and shots differ in length. Between anchors the film
 * plays at an even pace.
 *
 * There are hundreds of frames, so only the ones near the playhead are kept
 * in memory; the rest are fetched as the reader approaches.
 */
export interface FilmManifest {
  base: string;
  count: number;
  width: number;
  height: number;
  /** Frames per shot, used to pick one still per shot for reduced motion. */
  shot: number;
  /** [chapter id, frame] pairs in page order. */
  anchors: [string, number][];
}

/** Frames kept either side of the playhead, and the wider range that is not thrown away yet. */
const AHEAD = 20;
const KEEP = 32;

export default function FilmScroll({ manifest }: { manifest: FilmManifest }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const el = wrap.current!;
    const ctx = cv.getContext("2d")!;
    const n = manifest.count;
    cv.width = manifest.width;
    cv.height = manifest.height;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const anchors = manifest.anchors
      .map(([id, frame]) => [CHAPTERS.findIndex((c) => c.id === id), frame] as const)
      .filter(([c]) => c >= 0);
    const lastChapter = anchors[anchors.length - 1][0];

    const frameAt = (chapter: number) => {
      if (chapter <= anchors[0][0]) return anchors[0][1];
      for (let i = 1; i < anchors.length; i++) {
        const [c1, f1] = anchors[i];
        if (chapter <= c1) {
          const [c0, f0] = anchors[i - 1];
          return f0 + ((chapter - c0) / (c1 - c0)) * (f1 - f0);
        }
      }
      return anchors[anchors.length - 1][1];
    };

    const frames = new Map<number, HTMLImageElement>();
    const ready = new Set<number>();
    let lastDrawn = -1;
    let dirty = false;
    let raf = 0;

    const want = (i: number) => {
      if (i < 0 || i >= n || frames.has(i)) return;
      const img = new Image();
      img.decoding = "async";
      img.src = `${manifest.base}${String(i).padStart(3, "0")}.webp`;
      img.onload = () => {
        ready.add(i);
        dirty = true;
      };
      frames.set(i, img);
    };

    const tick = () => {
      const chapter = story.chapter;
      let pos = Math.min(Math.max(Math.round(frameAt(chapter)), 0), n - 1);
      // Reduced motion: one still per shot instead of moving pictures
      if (reduced) pos = Math.min(Math.floor(pos / manifest.shot) * manifest.shot + Math.floor(manifest.shot / 2), n - 1);

      // Nearest frames first, so the one on screen arrives before its neighbours
      want(pos);
      if (!reduced) {
        for (let d = 1; d <= AHEAD; d++) {
          want(pos + d);
          want(pos - d);
        }
      }
      for (const i of frames.keys()) {
        if (Math.abs(i - pos) > KEEP) {
          frames.get(i)!.onload = null;
          frames.delete(i);
          ready.delete(i);
        }
      }

      if (pos !== lastDrawn || dirty) {
        dirty = false;
        // If the exact frame has not arrived yet, show the closest one that has
        let k = -1;
        for (let d = 0; d <= KEEP && k < 0; d++) {
          if (ready.has(pos - d)) k = pos - d;
          else if (ready.has(pos + d)) k = pos + d;
        }
        if (k >= 0) {
          ctx.drawImage(frames.get(k)!, 0, 0, cv.width, cv.height);
          lastDrawn = k === pos ? pos : -1;
          el.dataset.ready = "true";
        }
      }

      // After the last shot the remaining chapters are text only: dim the held frame so they read
      el.style.setProperty("--dim", Math.min(Math.max((chapter - lastChapter - 0.1) * 0.9, 0), 0.6).toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      for (const img of frames.values()) img.onload = null;
    };
  }, [manifest]);

  return (
    <div ref={wrap} className="plate film-scroll" aria-hidden="true">
      <div className="plate-frame">
        <canvas ref={canvas} />
      </div>
      <div className="plate-grade" />
      <div className="plate-dim" />
    </div>
  );
}
