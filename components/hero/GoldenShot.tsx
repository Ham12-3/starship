"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { BOOSTER_H, MASTS, MAST_H, PAD_H, STACK_H, TOWER_H, TOWER_X, buildGround, buildSite, buildStack, buildTower, puffTexture } from "./builders";

/** Look-dev dials for the dusk hero shot. Tuned by eye against screenshots. */
export const LOOK = {
  hdri: "/hdri/industrial_sunset_puresky_1k.hdr",
  /** Turns the captured sky so the afterglow sits behind and to one side of the stack. */
  skyRotation: 0.6,
  skyIntensity: 0.4,
  haze: "#5a6076",
  hazeDensity: 0.00011,
  floodlight: "#dfe9ff",
  floodIntensity: 2.6e4,
};

/** Wind: a light onshore breeze, metres per second. */
const WIND = new THREE.Vector3(1.6, 0.25, -0.5);

interface Puff {
  sprite: THREE.Sprite;
  source: THREE.Vector3;
  age: number;
  life: number;
  size: number;
  seed: number;
}

/** Cold vapour venting from the loaded tanks and pooling around the mount. */
function Vapour() {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const maps = [1, 2, 3].map(puffTexture);
    // source position, puff count, final size (m), life (s)
    const sources: [THREE.Vector3, number, number, number][] = [
      [new THREE.Vector3(-4.6, PAD_H + 63, 0.5), 16, 11, 11],
      [new THREE.Vector3(-4.6, PAD_H + BOOSTER_H + 30, -0.5), 12, 8, 9],
      [new THREE.Vector3(-7, PAD_H + 2, 2), 20, 20, 16],
      [new THREE.Vector3(150, 6, 2), 14, 16, 15],
    ];
    const list: Puff[] = [];
    let n = 0;
    for (const [source, count, size, life] of sources) {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.SpriteMaterial({ map: maps[n % 3], color: "#aab6cf", transparent: true, depthWrite: false, opacity: 0, rotation: n * 1.7 });
        list.push({ sprite: new THREE.Sprite(mat), source, age: (i / count) * life, life, size, seed: n++ });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    const g = group.current!;
    for (const p of puffs) g.add(p.sprite);
    return () => void g.clear();
  }, [puffs]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1);
    for (const p of puffs) {
      p.age = (p.age + step) % p.life;
      const t = p.age / p.life;
      const wobble = Math.sin(p.seed * 12.9 + p.age * 0.7) * 1.5 * t;
      p.sprite.position.set(p.source.x + WIND.x * p.age + wobble, p.source.y + WIND.y * p.age + wobble * 0.3, p.source.z + WIND.z * p.age);
      const s = p.size * (0.18 + 0.82 * Math.sqrt(t));
      p.sprite.scale.set(s * 1.5, s, 1);
      p.sprite.material.opacity = Math.sin(Math.PI * Math.pow(t, 0.6)) * 0.5;
    }
  });

  return <group ref={group} />;
}

export default function GoldenShot({ onReady }: { onReady: () => void }) {
  const scene = useThree((s) => s.scene);
  const parts = useMemo(() => ({ stack: buildStack(), tower: buildTower(), site: buildSite(), ground: buildGround() }), []);

  useEffect(() => {
    let cancelled = false;
    new HDRLoader().load(LOOK.hdri, (hdr) => {
      if (cancelled) return;
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = hdr;
      scene.background = hdr;
      scene.backgroundBlurriness = 0.03;
      scene.environmentIntensity = LOOK.skyIntensity;
      scene.backgroundIntensity = LOOK.skyIntensity;
      scene.environmentRotation.y = LOOK.skyRotation;
      scene.backgroundRotation.y = LOOK.skyRotation;
      onReady();
    });
    scene.fog = new THREE.FogExp2(LOOK.haze, LOOK.hazeDensity);
    if (process.env.NODE_ENV === "development") (window as unknown as { __scene: THREE.Scene }).__scene = scene;
    return () => {
      cancelled = true;
      scene.fog = null;
    };
  }, [scene, onReady]);

  // Work lights: the visible lamps (very bright, so they bloom) and the pools
  // of light they throw on the stack and tower.
  const lamps = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff1dc").multiplyScalar(9) });
    const red = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff2a1a").multiplyScalar(30) });
    const g = new THREE.Group();
    const lamp = (x: number, y: number, z: number, r: number, m: THREE.Material = mat) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
      s.position.set(x, y, z);
      g.add(s);
    };
    for (const [x, z] of MASTS) for (let i = -1; i <= 1; i++) lamp(x + i * 1.6, MAST_H + 1, z + 0.6, 0.45);
    for (let y = 18; y < TOWER_H; y += 24) lamp(TOWER_X - 6, y, 6.6, 0.3);
    lamp(TOWER_X - 6, TOWER_H + 16.5, 0, 0.4, red);
    for (let i = 0; i < 9; i++) lamp(115 + i * 15.5, 3.5, -20, 0.25);
    return g;
  }, []);

  return (
    <>
      <primitive object={parts.ground} />
      <primitive object={parts.site} />
      <primitive object={parts.tower} />
      <primitive object={parts.stack} position={[0, PAD_H, 0]} />
      <primitive object={lamps} />
      <Vapour />
      {MASTS.map(([x, z], i) => (
        <Flood key={i} from={[x, MAST_H, z]} to={[0, PAD_H + STACK_H * (i % 2 ? 0.7 : 0.35), 0]} />
      ))}
    </>
  );
}

function Flood({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const light = useMemo(() => {
    const l = new THREE.SpotLight(LOOK.floodlight, LOOK.floodIntensity, 0, 0.5, 0.7, 2);
    l.position.set(...from);
    l.target.position.set(...to);
    return l;
  }, [from, to]);
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
}
