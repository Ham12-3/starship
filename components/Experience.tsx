"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import Scene from "./Scene";
import { guessTier, readHints, refineTier, tierOverride, type TierName } from "@/lib/quality";
import { maybeLoadStudio } from "@/lib/timeline";

export type Backend = "webgpu" | "webgl2";

/**
 * WebGPURenderer with automatic WebGL2 fallback. `?webgl` forces the fallback
 * so both paths can be tested on one machine.
 */
async function createRenderer(canvas: HTMLCanvasElement, onBackend: (b: Backend) => void) {
  const forceWebGL = new URLSearchParams(location.search).has("webgl");
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL, powerPreference: "high-performance" });
  await renderer.init();
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const isWebGPU = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;
  onBackend(isWebGPU ? "webgpu" : "webgl2");
  return renderer;
}

export default function Experience() {
  const [tier, setTier] = useState<TierName | null>(null);
  const [backend, setBackend] = useState<Backend | null>(null);
  const pinned = useRef(false);

  useEffect(() => {
    const override = tierOverride();
    pinned.current = override !== null;
    setTier(override ?? guessTier(readHints()));
    void maybeLoadStudio();
  }, []);

  const onBenchmark = useCallback((ms: number[]) => {
    if (pinned.current) return;
    pinned.current = true; // benchmark runs once
    setTier((t) => (t ? refineTier(t, ms) : t));
  }, []);

  if (!tier) return null;

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        flat
        // R3F accepts an async renderer factory; its types still describe WebGLRenderer.
        gl={((props: { canvas: HTMLCanvasElement }) => createRenderer(props.canvas, setBackend)) as never}
        camera={{ fov: 10, near: 0.5, far: 60000, position: [0, 1.6, 1400] }}
        dpr={1}
      >
        <Scene tier={tier} onBenchmark={onBenchmark} />
      </Canvas>
      {process.env.NODE_ENV === "development" && (
        <div className="debug">
          {backend ?? "starting"} · {tier}
        </div>
      )}
    </div>
  );
}
