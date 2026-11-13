"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import rockets from "@/data/rockets.json";
import { story } from "@/lib/chapters";
import { getCameraObject, seek } from "@/lib/timeline";
import { TIERS, type TierName } from "@/lib/quality";

const FULL_FRAME_WIDTH_MM = 36;
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
    camera.near = 0.5;
    camera.far = 60000;
  }, [camera]);

  useFrame(() => {
    seek(story.progress);
    const v = obj.value;
    const b = v.bearing * DEG;
    camera.position.set(Math.sin(b) * v.distance, v.height, Math.cos(b) * v.distance);
    camera.lookAt(0, v.lookHeight, 0);
    if (camera.getFocalLength() !== v.focalLength) camera.setFocalLength(v.focalLength);
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

/**
 * Phase 0 stand-ins only: a plain cylinder at the real stack size and a
 * person-height post beside it, so camera moves and scale can be judged.
 * Replaced by the hero model in Phase 1/2.
 */
function Placeholders() {
  const h = rockets.hero.stackHeight.value;
  const d = rockets.hero.diameter.value;
  const boosterH = rockets.hero.boosterHeight.value;
  const person = rockets.scaleReferences.find((r) => r.id === "person")!.height.value;
  return (
    <>
      <mesh position={[0, boosterH / 2, 0]}>
        <cylinderGeometry args={[d / 2, d / 2, boosterH, 64]} />
        <meshStandardMaterial color="#8a8d90" metalness={0.9} roughness={0.45} />
      </mesh>
      <mesh position={[0, boosterH + (h - boosterH) / 2, 0]}>
        <cylinderGeometry args={[d / 2, d / 2, h - boosterH, 64]} />
        <meshStandardMaterial color="#6f7276" metalness={0.9} roughness={0.5} />
      </mesh>
      <mesh position={[12, person / 2, 0]}>
        <boxGeometry args={[0.5, person, 0.3]} />
        <meshStandardMaterial color="#d9772b" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[30000, 64]} />
        <meshStandardMaterial color="#3a3835" roughness={1} />
      </mesh>
    </>
  );
}

export default function Scene({ tier, onBenchmark }: { tier: TierName; onBenchmark: (ms: number[]) => void }) {
  return (
    <>
      <color attach="background" args={["#1b2230"]} />
      <fog attach="fog" args={["#1b2230", 800, 9000]} />
      <hemisphereLight args={["#5d7190", "#2a2622", 0.9]} />
      <directionalLight position={[-800, 120, 300]} intensity={2.4} color="#ffb27a" />
      <CameraRig />
      <Governor tier={tier} onBenchmark={onBenchmark} />
      <Placeholders />
    </>
  );
}
