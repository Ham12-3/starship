"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, story } from "@/lib/chapters";

/**
 * Real photographs (NASA) shown full screen across a chapter: each one fades in,
 * drifts slowly closer, and hands over to the next as the reader scrolls.
 * Planets are shown whole on black ("contain"); scenes fill the screen ("cover").
 */
export interface Photo {
  src: string;
  alt: string;
  credit: string;
  fit?: "cover" | "contain";
  /** Horizontal position of the subject, 0 left to 1 right. */
  focus?: number;
}

export default function PhotoChapter({ chapter, photos }: { chapter: string; photos: Photo[] }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".photo"));
    const first = CHAPTERS.findIndex((c) => c.id === chapter);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let loaded = false;
    let raf = 0;
    const tick = () => {
      const c = story.chapter;
      if (!loaded && c > first - 1.2) {
        loaded = true;
        for (const img of el.querySelectorAll<HTMLImageElement>("img[data-src]")) img.src = img.dataset.src!;
      }
      const fade = Math.min(Math.max((c - first + 0.4) / 0.4, 0), 1) * Math.min(Math.max((first + 1.4 - c) / 0.4, 0), 1);
      el.style.opacity = fade.toFixed(3);
      if (fade > 0) {
        const u = Math.min(Math.max(c - first, 0), 0.999) * items.length;
        items.forEach((it, i) => {
          // each photo holds for most of its slot and cross-fades over the last fifth
          const local = u - i;
          const o = i === 0 ? (local < 0.8 ? 1 : 1 - (local - 0.8) / 0.2) : local < -0.2 ? 0 : local < 0 ? (local + 0.2) / 0.2 : local < 0.8 || i === items.length - 1 ? 1 : 1 - (local - 0.8) / 0.2;
          it.style.opacity = Math.min(Math.max(o, 0), 1).toFixed(3);
          if (!reduced) it.style.setProperty("--zoom", (1 + 0.06 * Math.min(Math.max(local + 0.2, 0), 1.2)).toFixed(4));
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [chapter]);

  return (
    <div ref={wrap} className="plate photos" aria-hidden="true" style={{ opacity: 0 }}>
      {photos.map((p) => (
        <figure key={p.src} className={`photo ${p.fit ?? "cover"}`} style={{ opacity: 0, ["--focus" as string]: p.focus ?? 0.5 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-src={p.src} alt={p.alt} decoding="async" />
          <figcaption>{p.credit}</figcaption>
        </figure>
      ))}
      <div className="plate-grade" />
      <div className="plate-grain" />
    </div>
  );
}
