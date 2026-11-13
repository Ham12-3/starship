"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import HeroPlate from "@/components/HeroPlate";
import Story from "@/components/Story";

// The live 3D stage is kept for the interactive chapters still to come. It is
// off by default while the hero is a path-traced plate; add ?live to see it.
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
      {live ? <Experience /> : <HeroPlate />}
      <Story />
      <footer className="legal">
        Independent educational fan project. Not affiliated with or endorsed by SpaceX, NASA, Blue Origin, ESA, CASC or
        any agency or company shown.
      </footer>
    </main>
  );
}
