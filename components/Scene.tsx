"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import GoldenShot from "./hero/GoldenShot";
import Post from "./Post";
import { story } from "@/lib/chapters";
import { getCameraObject, seek } from "@/lib/timeline";
import { TIERS, type TierName } from "@/lib/quality";

const FULL_FRAME_WIDTH_MM = 36;
const SENSOR_HEIGHT_MM = (FULL_FRAME_WIDTH_MM * 9) / 16;
const DEG = Math.PI / 180;

/**
 * Camera rig. Theatre.js supplies operator-style values (where the camera
 * stands, what lens is on it); this turns them into a three.js camera with a
 * real full-frame sensor so focal lengths mean what they mean on set.
 */
function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const obj = useMemo(() => getCameraObject(), []);

  useEffect(() => {
    camera.filmGauge = FULL_FRAME_WIDTH_MM;
    camera.near = 5;
    camera.far = 80000;
  }, [camera]);

  useFrame(({ clock }) => {
    seek(story.progress);
    const v = obj.value;
    const b = v.bearing * DEG;
    camera.position.set(Math.sin(b) * v.distance, v.height, Math.cos(b) * v.distance);
    // A tracking mount is never perfectly still: slow drift plus a faint
    // tremor, sized in angle so it reads the same on any lens.
    const t = clock.elapsedTime;
    const wander = v.distance * 0.00009;
    const dx = (Math.sin(t * 0.21) + 0.6 * Math.sin(t * 0.53 + 1.3) + 0.12 * Math.sin(t * 7.1)) * wander;
    const dy = (Math.sin(t * 0.17 + 2.1) + 0.5 * Math.sin(t * 0.61) + 0.12 * Math.sin(t * 8.3 + 0.4)) * wander;
    const px = dx + v.pan; // pan: metres left or right of the pad, at the pad
    camera.lookAt(px * Math.cos(b), v.lookHeight + dy, -px * Math.sin(b));
    // Focal lengths are for a 16:9 crop of a full-frame sensor (20.25 mm tall).
    // Fixing the vertical angle keeps the stack framed the same on any screen
    // shape: wider screens see more to the sides, never less top to bottom.
    const fov = (2 * Math.atan(SENSOR_HEIGHT_MM / 2 / v.focalLength)) / DEG;
    if (Math.abs(camera.fov - fov) > 1e-5) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, -1);

  return null;
}

/**
 * Dynamic resolution scaling: nudges the pixel ratio to hold the tier's frame
 * rate. Also reports the first ~1 s of frame times for the tier benchmark.
 */
function Governor({ tier, onBenchmark }: { tier: TierName; onBenchmark: (ms: number[]) => void }) {
  const setDpr = useThree((s) => s.setDpr);
  const settings = TIERS[tier];
  const dpr = useRef(Math.min(window.devicePixelRatio, settings.dprMax));
  const samples = useRef<number[]>([]);
  const bench = useRef<number[] | null>([]);
  const warmup = useRef(20); // skip shader-compile frames

  useEffect(() => {
    dpr.current = Math.min(window.devicePixelRatio, settings.dprMax);
    setDpr(dpr.current);
  }, [settings, setDpr]);

  useFrame((_, delta) => {
    const ms = delta * 1000;
    if (warmup.current > 0) return void warmup.current--;
    if (ms > 250 || document.hidden) return; // hidden tabs are throttled: not a real measurement

    if (bench.current) {
      bench.current.push(ms);
      if (bench.current.reduce((a, b) => a + b, 0) >= 1000) {
        onBenchmark(bench.current);
        bench.current = null;
      }
    }

    samples.current.push(ms);
    if (samples.current.length < 30) return;
    const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
    samples.current = [];
    const budget = 1000 / settings.targetFps;
    let next = dpr.current;
    if (avg > budget * 1.15) next -= 0.1;
    else if (avg < budget * 1.03) next += 0.05;
    next = Math.min(Math.max(next, settings.dprMin), Math.min(window.devicePixelRatio, settings.dprMax));
    if (Math.abs(next - dpr.current) > 0.001) {
      dpr.current = next;
      setDpr(next);
    }
  });

  return null;
}

export default function Scene({ tier, onBenchmark, onReady }: { tier: TierName; onBenchmark: (ms: number[]) => void; onReady: () => void }) {
  return (
    <>
      <CameraRig />
      <Governor tier={tier} onBenchmark={onBenchmark} />
      <GoldenShot onReady={onReady} shadows={tier === "ultra" || tier === "high"} />
      <Post tier={tier} />
    </>
  );
}
