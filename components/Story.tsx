"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { CHAPTERS, LAUNCH_CHAPTER, story, type Beat } from "@/lib/chapters";
import rockets from "@/data/rockets.json";

gsap.registerPlugin(ScrollTrigger);

/** The handful of chapters offered in the top bar; the dots cover the rest. */
const NAV = [
  { id: "steel", label: "Build" },
  { id: "rollout", label: "Rollout" },
  { id: "liftoff", label: "Liftoff" },
  { id: "orbit", label: "Orbit" },
  { id: "payload", label: "Payload" },
];

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
        // Past the top of the last chapter the fraction reaches 1, so clamp to the last index
        const i = Math.min(Math.round(story.chapter), CHAPTERS.length - 1);
        if (i !== activeRef.current) {
          activeRef.current = i;
          setActive(i);
          if (settling) return;
          history.replaceState(null, "", i === 0 ? location.pathname + location.search : `#${CHAPTERS[i].id}`);
        }
      },
    });

    // Captions are pinned low in the middle of the picture. Each one has a tall
    // invisible slot in the page; it is shown while its slot crosses the screen.
    const slots = Array.from(root.current!.querySelectorAll<HTMLElement>(".cap"));
    let capRaf = 0;
    const caps = () => {
      const vh = window.innerHeight;
      for (const slot of slots) {
        const r = slot.getBoundingClientRect();
        const inner = slot.firstElementChild as HTMLElement;
        if (r.bottom < -vh || r.top > 2 * vh) {
          if (inner.style.opacity !== "0") {
            inner.style.opacity = "0";
            inner.style.visibility = "hidden";
          }
          continue;
        }
        // d runs from -0.5 to 0.5 as the slot's middle passes the middle of the screen
        const d = (r.top + r.height / 2 - vh / 2) / r.height;
        const o = Math.min(Math.max((0.5 - Math.abs(d)) / 0.14, 0), 1);
        inner.style.opacity = o.toFixed(3);
        inner.style.visibility = o > 0 ? "visible" : "hidden";
        if (!reduced) inner.style.setProperty("--rise", (d * 28).toFixed(1) + "px");
      }
      capRaf = requestAnimationFrame(caps);
    };
    capRaf = requestAnimationFrame(caps);

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
      cancelAnimationFrame(capRaf);
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

  const launchIndex = CHAPTERS.findIndex((c) => c.id === LAUNCH_CHAPTER);
  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    goTo(CHAPTERS.findIndex((c) => c.id === id));
  };

  return (
    <>
      <header className="bar">
        <a className="brand" href="#top" onClick={jump("top")}>
          <span className="brand-mark" aria-hidden="true" />
          Factory to Orbit
        </a>
        <nav className="bar-nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.id} href={"#" + n.id} onClick={jump(n.id)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="bar-actions">
          <a className="pill ghost" href="#credits" onClick={jump("credits")}>
            Credits
          </a>
          <a className="pill solid" href={"#" + LAUNCH_CHAPTER} onClick={jump(LAUNCH_CHAPTER)}>
            {active < launchIndex ? "Skip to launch" : "Watch the launch"}
          </a>
        </div>
      </header>

      <div ref={root} className="story">
        {CHAPTERS.map((c, i) => (
          <section key={c.id} id={c.id} className="chapter" aria-label={c.label}>
            {i === 0 ? (
              <div className="cap">
                <div className="cap-inner">
                  <p className="badge">Scroll to begin</p>
                  <h1>Taller than the Statue of Liberty.</h1>
                  <p className="sub">
                    {Math.round(Math.round(height) * 3.28084)} feet ({Math.round(height)} metres) of steel, built to fly to orbit and come back.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="cap">
                  <div className="cap-inner">
                    <p className="badge">Chapter {i}</p>
                    <h2>{c.label}</h2>
                  </div>
                </div>
                {(c.id === "liftoff" ? liftoffBeats : (c.beats ?? [])).map((b, k) => (
                  <div key={k} className="cap">
                    <div className="cap-inner">
                      {b.kicker && <p className="badge">{b.kicker}</p>}
                      <p className="say">{b.text}</p>
                    </div>
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
            href={"#" + c.id}
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
    </>
  );
}
