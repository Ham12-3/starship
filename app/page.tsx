"use client";

import dynamic from "next/dynamic";
import Story from "@/components/Story";

// The 3D stage is client-only and loaded after first paint so the headline shows at once.
const Experience = dynamic(() => import("@/components/Experience"), { ssr: false });

export default function Page() {
  return (
    <main>
      <Experience />
      <Story />
      <footer className="legal">
        Independent educational fan project. Not affiliated with or endorsed by SpaceX, NASA, Blue Origin, ESA, CASC or
        any agency or company shown.
      </footer>
    </main>
  );
}
