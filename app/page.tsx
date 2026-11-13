"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import FilmScroll, { type FilmManifest } from "@/components/FilmScroll";
import Story from "@/components/Story";
import film from "@/data/film-plate.json";

// The live 3D stage is kept for the interactive chapters still to come. It is
// off by default while the story is told with the scroll-scrubbed film; add ?live to see it.
const Experience = dynamic(() => import("@/components/Experience"), { ssr: false });

export default function Page() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setLive(q.has("live"));
    if (q.has("clean")) document.documentElement.dataset.clean = "";
  }, []);
  return (
    <main>
      {live ? (
        <Experience />
      ) : (
        <FilmScroll manifest={film as FilmManifest} />
      )}
      <Story />
      <footer className="legal">
        <p>
          Independent educational fan project. Not affiliated with or endorsed by SpaceX, NASA, Blue Origin, ESA, CASC
          or any agency or company shown.
        </p>
        <p>
          The pictures are frames from an AI-generated film made with Google Flow for this site. They are an
          illustration, not real footage, and not to scale.
        </p>
      </footer>
    </main>
  );
}
