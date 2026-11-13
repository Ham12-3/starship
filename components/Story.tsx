"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { CHAPTERS, LAUNCH_CHAPTER, story, type Beat } from "@/lib/chapters";
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

    let tops: number[] = [0];
    const measure = () => {
      tops = CHAPTERS.map((ch) => document.getElementById(ch.id)?.offsetTop ?? 0);
    };
    measure();

    const trigger = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom bottom",
      onRefresh: measure,
      onUpdate: (self) => {
        story.progress = self.progress;
        // Which section is at the top of the screen, and how far through it we are
        const y = window.scrollY;
        let k = 0;
        while (k < tops.length - 1 && y >= tops[k + 1]) k++;
        const next = k < tops.length - 1 ? tops[k + 1] : tops[k] + 1;
        story.chapter = k + Math.min(Math.max((y - tops[k]) / Math.max(next - tops[k], 1), 0), 1);
        const i = Math.round(story.chapter);
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
  const hero = rockets.hero;
  // Copy for the launch, built from the data file so no number is typed twice
  const liftoffBeats: Beat[] = [
    { side: "right", kicker: "Ignition", text: `${hero.boosterEngines.value} engines light, a few at a time.` },
    { side: "left", kicker: "T+0:00:00", text: "The clamps let go. Liftoff." },
    { side: "right", kicker: "Thrust", text: `About ${Math.round(hero.boosterLiftoffThrust.value / 10) * 10} meganewtons. More than any rocket before it.` },
    { side: "left", kicker: "The white cloud", text: "Mostly steam. Water floods the pad to protect it from the fire." },
    { side: "right", kicker: "Weight", text: `About ${hero.liftoffMass.value.toLocaleString("en-US")} tonnes, rising on a column of fire.` },
  ];

  return (
    <>
      <div ref={root} className="story">
        {CHAPTERS.map((c, i) => (
          <section key={c.id} id={c.id} className="chapter" aria-label={c.label}>
            {i === 0 ? (
              <div className="copy">
                <h1>Taller than the Statue of Liberty.</h1>
                <p className="lede">
                  {Math.round(Math.round(height) * 3.28084)} feet ({Math.round(height)} metres) of steel, built to fly to orbit and come back.
                </p>
                <p className="cue">Scroll to begin</p>
              </div>
            ) : (
              <>
                <div className={`copy passing ${i % 2 ? "left" : "right"}`}>
                  <p className="eyebrow">Chapter {i}</p>
                  <h2>{c.label}</h2>
                </div>
                {(c.id === "liftoff" ? liftoffBeats : (c.beats ?? [])).map((b, k) => (
                  <div key={k} className={`copy passing beat ${b.side}`}>
                    {b.kicker && <p className="eyebrow">{b.kicker}</p>}
                    <p className="lede">{b.text}</p>
                  </div>
                ))}
              </>
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
