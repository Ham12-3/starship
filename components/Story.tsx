"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { CHAPTERS, LAUNCH_CHAPTER, story } from "@/lib/chapters";
import rockets from "@/data/rockets.json";

gsap.registerPlugin(ScrollTrigger);

/**
 * The scroll spine: one tall section per chapter. Scroll position becomes
 * story.progress (0..1), which drives the Theatre.js playhead in the scene.
 */
export default function Story() {
  const root = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const goTo = (index: number, immediate = false) => {
    const i = Math.min(Math.max(index, 0), CHAPTERS.length - 1);
    const el = document.getElementById(CHAPTERS[i].id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { immediate, force: true });
    else el.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
  };

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Lenis smooths wheel input; skipped entirely for reduced motion.
    let lenis: Lenis | null = null;
    const tick = (time: number) => lenis?.raf(time * 1000);
    if (!reduced) {
      lenis = new Lenis({ lerp: 0.09 });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    // Deep link (/#liftoff): read the hash before anything can rewrite it, and
    // hold off hash updates until the jump has landed.
    const fromHash = CHAPTERS.findIndex((c) => c.id === location.hash.slice(1));
    let settling = fromHash > 0;
    const settle = window.setTimeout(() => {
      if (fromHash > 0) {
        ScrollTrigger.refresh();
        goTo(fromHash, true);
        ScrollTrigger.update();
      }
      settling = false;
    }, 150);

    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        story.progress = self.progress;
        const i = Math.round(self.progress * (CHAPTERS.length - 1));
        if (i !== activeRef.current) {
          activeRef.current = i;
          setActive(i);
          if (settling) return;
          history.replaceState(null, "", i === 0 ? location.pathname + location.search : `#${CHAPTERS[i].id}`);
        }
      },
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goTo(activeRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(activeRef.current - 1);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(settle);
      trigger.kill();
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  const height = rockets.hero.stackHeight.value;

  return (
    <>
      <div ref={root} className="story">
        {CHAPTERS.map((c, i) => (
          <section key={c.id} id={c.id} className="chapter" aria-label={c.label}>
            {i === 0 ? (
              <div className="copy">
                <h1>Taller than Big Ben.</h1>
                <p className="lede">{Math.round(height)} metres of steel, built to fly to orbit and come back.</p>
                <p className="cue">Scroll to begin</p>
              </div>
            ) : (
              <div className="copy">
                <p className="eyebrow">Chapter {i}</p>
                <h2>{c.label}</h2>
              </div>
            )}
          </section>
        ))}
      </div>

      <nav className="dots" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            aria-label={c.label}
            aria-current={i === active ? "step" : undefined}
            title={c.label}
            onClick={(e) => {
              e.preventDefault();
              goTo(i);
            }}
          />
        ))}
      </nav>

      {active < CHAPTERS.findIndex((c) => c.id === LAUNCH_CHAPTER) && (
        <button className="skip" onClick={() => goTo(CHAPTERS.findIndex((c) => c.id === LAUNCH_CHAPTER))}>
          Skip to launch
        </button>
      )}
    </>
  );
}
