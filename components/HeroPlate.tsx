"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, story } from "@/lib/chapters";

/**
 * The hero as a path-traced plate (blender/hero.py) with a thin live layer on
 * top: drifting vapour, a blinking beacon, film grain and a slow push-in tied
 * to scroll. The plate carries the light; the live layer only adds motion.
 *
 * Overlay positions are percentages of the plate, which is always scaled to
 * cover the screen at its own 16:9 shape, so they stay glued to the picture.
 */
const PLATE = { src: "/plates/hero.webp", small: "/plates/hero-1280.webp", focusX: 0.63 };
/** Where things are in the picture, as fractions of its width and height. */
const BEACON = { x: 0.5836, y: 0.018 };
const PUFFS = [
  { x: 0.662, y: 0.865, w: 0.085, h: 0.05, dur: 19, delay: 0 },
  { x: 0.64, y: 0.88, w: 0.07, h: 0.04, dur: 23, delay: -9 },
  { x: 0.668, y: 0.5, w: 0.035, h: 0.02, dur: 15, delay: -4 },
  { x: 0.664, y: 0.31, w: 0.028, h: 0.016, dur: 13, delay: -7 },
];

function grainTile() {
  const c = document.createElement("canvas");
  c.width = c.height = 192;
  const g = c.getContext("2d")!;
  const img = g.createImageData(192, 192);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 110;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export default function HeroPlate() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    el.style.setProperty("--grain", `url(${grainTile()})`);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const chapter = story.progress * (CHAPTERS.length - 1);
      // Push in over the first two chapters, then hold; a drone never sits perfectly still.
      const push = 1 + 0.07 * Math.min(chapter / 2, 1);
      const dx = Math.sin(t * 0.21) * 0.12 + Math.sin(t * 0.53 + 1.3) * 0.06;
      const dy = Math.sin(t * 0.17 + 2.1) * 0.1 + Math.sin(t * 0.61) * 0.05;
      el.style.setProperty("--push", push.toFixed(4));
      el.style.setProperty("--dx", `${dx.toFixed(3)}%`);
      el.style.setProperty("--dy", `${dy.toFixed(3)}%`);
      // Later chapters are placeholders: dim the plate so their titles read.
      el.style.setProperty("--dim", Math.min(Math.max(chapter - 0.6, 0) * 0.5, 0.62).toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={root} className="plate" aria-hidden="true">
      <div className="plate-frame" style={{ ["--focus" as string]: PLATE.focusX }}>
        <picture>
          <source media="(max-width: 900px)" srcSet={PLATE.small} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PLATE.src} alt="" decoding="async" fetchPriority="high" />
        </picture>
        {PUFFS.map((p, i) => (
          <span
            key={i}
            className="puff"
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: `${p.w * 100}%`,
              height: `${p.h * 100}%`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
        <span className="beacon" style={{ left: `${BEACON.x * 100}%`, top: `${BEACON.y * 100}%` }} />
      </div>
      <div className="plate-grade" />
      <div className="plate-grain" />
      <div className="plate-dim" />
    </div>
  );
}
