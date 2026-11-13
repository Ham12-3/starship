"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Film from "@/components/Film";
import HeroPlate from "@/components/HeroPlate";
import PhotoChapter from "@/components/PhotoChapter";
import SequencePlate from "@/components/SequencePlate";
import Story from "@/components/Story";
import liftoff from "@/data/liftoff-plate.json";
import staging from "@/data/staging-plate.json";
import deploy from "@/data/deploy-plate.json";

// The live 3D stage is kept for the interactive chapters still to come. It is
// off by default while the story is told with rendered plates; add ?live to see it.
const Experience = dynamic(() => import("@/components/Experience"), { ssr: false });

const STAGING_BGS = [
  { until: 27, src: "/space/limb.webp" },
  { until: 9999, src: "/space/earth-day.webp" },
];
const DEPLOY_BGS = [{ until: 9999, src: "/space/earth-day.webp" }];

const ORBIT = [
  { src: "/space/milky-way.webp", alt: "The Milky Way above the glow of Earth's atmosphere at night", credit: "Photo: NASA, ISS Expedition 63 crew" },
];
const BEYOND = [
  { src: "/space/jupiter.webp", alt: "Jupiter in true colour", credit: "Image: NASA/JPL/Space Science Institute (Cassini)", fit: "contain" as const, focus: 0.68 },
  { src: "/space/saturn.webp", alt: "Saturn and its rings", credit: "Image: NASA/JPL/Space Science Institute (Cassini)", fit: "contain" as const, focus: 0.62 },
  { src: "/space/carina.webp", alt: "The Cosmic Cliffs in the Carina Nebula", credit: "Image: NASA, ESA, CSA, STScI (Webb)" },
];

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
        <>
          <HeroPlate />
          <SequencePlate manifest={liftoff} from="liftoff" focus={0.63} />
          <SequencePlate manifest={staging} from="staging" span={2} backgrounds={STAGING_BGS} />
          <PhotoChapter chapter="orbit" photos={ORBIT} />
          <PhotoChapter chapter="beyond" photos={BEYOND} />
          <SequencePlate manifest={deploy} from="payload" backgrounds={DEPLOY_BGS} focus={0.45} />
        </>
      )}
      <Story />
      <Film />
      <footer className="legal">
        <p>
          Independent educational fan project. Not affiliated with or endorsed by SpaceX, NASA, Blue Origin, ESA, CASC
          or any agency or company shown.
        </p>
        <p>
          Rocket scenes in the scroll story are 3D renders made for this site. The short film is an AI-generated
          illustration made with Google Flow. Photographs of Earth, planets and space: NASA (ISS crews;
          JPL/Space Science Institute) and NASA, ESA, CSA, STScI (Webb).
        </p>
      </footer>
    </main>
  );
}
