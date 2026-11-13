"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { buildLagoon } from "./water";
import {
  BOOSTER_H,
  MASTS,
  MAST_H,
  PAD_H,
  STACK_H,
  TOWER_H,
  TOWER_X,
  buildAfterglow,
  buildForeground,
  buildGround,
  buildSite,
  buildStack,
  buildTower,
  glintTexture,
  puffTexture,
} from "./builders";

/** Look-dev dials for the dusk hero shot. Tuned by eye against screenshots. */
export const LOOK = {
  hdri: "/hdri/industrial_sunset_puresky_1k.hdr",
  /** Turns the captured sky so the afterglow sits off to one side of the stack. */
  skyRotation: 0.6,
  skyIntensity: 0.4,
  haze: "#5a6076",
  hazeDensity: 0.00011,
  floodlight: "#dfe9ff",
  floodIntensity: 2.6e4,
  /** Where the telescope stands, on the ground. Must match the Theatre camera at chapter 0. */
  cameraBearingDeg: 32,
  cameraDistance: 4000,
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
  peak: number;
}

/** Cold vapour venting from the loaded tanks and pooling around the mount. */
function Vapour() {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const maps = [1, 2, 3, 4, 5].map(puffTexture);
    // source, puff count, final size (m), life (s), peak opacity, tint
    const sources: [THREE.Vector3, number, number, number, number, string][] = [
      [new THREE.Vector3(-4.6, PAD_H + 63, 0.5), 26, 10, 10, 0.42, "#c9d3e6"],
      [new THREE.Vector3(-4.6, PAD_H + BOOSTER_H + 30, -0.5), 20, 7, 8, 0.36, "#b9c4da"],
      [new THREE.Vector3(4.7, PAD_H + 28, 1), 14, 6, 7, 0.3, "#c9d3e6"],
      [new THREE.Vector3(-7, PAD_H + 1, 2), 34, 22, 18, 0.4, "#aeb9cf"],
      [new THREE.Vector3(150, 5, 2), 22, 18, 16, 0.34, "#a6b1c8"],
    ];
    const list: Puff[] = [];
    let n = 0;
    for (const [source, count, size, life, peak, tint] of sources) {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.SpriteMaterial({ map: maps[n % maps.length], color: tint, transparent: true, depthWrite: false, opacity: 0, rotation: n * 1.7 });
        list.push({ sprite: new THREE.Sprite(mat), source, age: (i / count) * life, life: life * (0.8 + ((n * 37) % 10) / 25), size, seed: n++, peak });
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
      // Cold gas is heavy: it leaves sideways, sinks a little, then lifts as it warms
      const sink = -1.8 * Math.sin(Math.min(t * 2.2, 1) * Math.PI) + WIND.y * p.age;
      const wobble = Math.sin(p.seed * 12.9 + p.age * 0.7) * 1.8 * t;
      p.sprite.position.set(p.source.x + WIND.x * p.age + wobble, p.source.y + sink + wobble * 0.3, p.source.z + WIND.z * p.age + Math.cos(p.seed * 3.1) * t * 2);
      const s = p.size * (0.14 + 0.86 * Math.sqrt(t));
      p.sprite.scale.set(s * (1.3 + 0.5 * Math.sin(p.seed)), s, 1);
      p.sprite.material.rotation = p.seed * 1.7 + p.age * 0.05 * (p.seed % 2 ? 1 : -1);
      p.sprite.material.opacity = Math.sin(Math.PI * Math.pow(t, 0.55)) * p.peak;
    }
  });

  return <group ref={group} />;
}

/**
 * Everything that glows or moves: lamps with lens glints, the blinking tower
 * beacon, and a truck on the access road. A still frame is the first tell.
 */
function Lights() {
  const { group, beacon, truck } = useMemo(() => {
    const g = new THREE.Group();
    const glint = glintTexture();
    const white = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff1dc").multiplyScalar(9) });
    const lamp = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, size: number, color = "#fff3e2", strength = 1) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), white);
      bulb.position.set(x, y, z);
      const mat = new THREE.SpriteMaterial({ map: glint, color: new THREE.Color(color).multiplyScalar(strength), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
      const flare = new THREE.Sprite(mat);
      flare.position.set(x, y, z);
      flare.scale.setScalar(size);
      parent.add(bulb, flare);
      return flare;
    };
    for (const [x, z] of MASTS) lamp(g, x, MAST_H + 1, z + 0.6, 0.6, 17, "#fff3e2", 1.3);
    for (let y = 18; y < TOWER_H; y += 24) lamp(g, TOWER_X - 6, y, 6.8, 0.3, 9);
    for (let y = 30; y < TOWER_H; y += 36) lamp(g, TOWER_X + 0.9, y, -4, 0.25, 7, "#ffe9c4");
    for (let i = 0; i < 9; i++) lamp(g, 115 + i * 15.5, 3.5, -20, 0.25, 7, "#ffb060", 1.1);
    for (let i = 0; i < 5; i++) lamp(g, -100 - i * 34, 6, 12, 0.22, 5, "#ffd9a0", 0.7);
    const beaconFlare = lamp(g, TOWER_X - 6, TOWER_H + 16.5, 0, 0.3, 12, "#ff2a12", 2);

    // Pickup on the access road, headlights toward the camera side
    const t = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: "#c9c9c4", roughness: 0.5 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.0, 2), body);
    b1.position.y = 1.0;
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.9), body);
    b2.position.set(-0.4, 1.9, 0);
    t.add(b1, b2);
    for (const z of [-0.7, 0.7]) lamp(t, 2.95, 1.05, z, 0.1, 5, "#fff6e8", 1.2);
    g.add(t);
    return { group: g, beacon: beaconFlare, truck: t };
  }, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    // Aviation beacon: about 40 flashes a minute, with a filament-like fade
    const phase = (time % 1.5) / 1.5;
    beacon.material.opacity = phase < 0.45 ? Math.sin((phase / 0.45) * Math.PI) : 0.04;
    // 25 km/h along the road in front of the pad, then back again
    const span = 520;
    const u = (time * 7) % (span * 2);
    const forward = u < span;
    truck.position.set(forward ? -260 + u : 260 - (u - span), 0, 74);
    truck.rotation.y = forward ? 0 : Math.PI;
  });

  return <primitive object={group} />;
}

/**
 * People and birds. A worker is nine pixels tall at this distance, which is
 * exactly enough to tell the eye how big everything else is.
 */
function Life() {
  const { group, walkers, birds } = useMemo(() => {
    const g = new THREE.Group();
    const legs = new THREE.MeshStandardMaterial({ color: "#1d2230", roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: "#c9c4bb", roughness: 0.6 });
    const vests = ["#d8f02a", "#ff7a1a"].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, emissive: c, emissiveIntensity: 0.12 }));
    const legGeo = new THREE.BoxGeometry(0.34, 0.86, 0.24);
    const torsoGeo = new THREE.BoxGeometry(0.46, 0.64, 0.27);
    const headGeo = new THREE.SphereGeometry(0.13, 8, 6);
    const person = (x: number, z: number, i: number) => {
      const p = new THREE.Group();
      const a = new THREE.Mesh(legGeo, legs);
      a.position.y = 0.43;
      const t = new THREE.Mesh(torsoGeo, vests[i % 2]);
      t.position.y = 1.18;
      const h = new THREE.Mesh(headGeo, skin); // pale hard hat
      h.position.y = 1.63;
      p.add(a, t, h);
      p.position.set(x, 1.2, z); // standing on the pad apron
      g.add(p);
      return p;
    };
    const spots: [number, number][] = [
      [38, 27], [39.2, 27.6], [-22, 28], [61, 37], [63.5, 38.2], [-55, 43], [-12, 29],
      [18, 28.5], [19.3, 28], [84, 30], [-33, 27.5], [5, 29],
    ];
    const people = spots.map(([x, z], i) => person(x, z, i));
    const w = [people[2], people[9], people[11]];

    // Brown pelicans, about 2 m across, in a loose line
    const wing = new THREE.BufferGeometry();
    wing.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.22, 0, 0, 0.22, 1.05, 0, 0.05], 3));
    wing.computeVertexNormals();
    const dark = new THREE.MeshBasicMaterial({ color: "#14161a", side: THREE.DoubleSide });
    const flock: { bird: THREE.Group; l: THREE.Mesh; r: THREE.Mesh; off: THREE.Vector3; phase: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const bird = new THREE.Group();
      const l = new THREE.Mesh(wing, dark);
      const r = new THREE.Mesh(wing, dark);
      r.scale.x = -1;
      bird.add(l, r);
      g.add(bird);
      flock.push({ bird, l, r, off: new THREE.Vector3(-i * 4.2, Math.sin(i * 1.7) * 1.3, i * 2.6 + Math.cos(i) * 1.5), phase: i * 0.9 });
    }
    return { group: g, walkers: w, birds: flock };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    walkers.forEach((p, i) => {
      // An unhurried walk, about 1.2 m/s, back and forth along the apron
      const span = 30 + i * 9;
      const u = (t * 1.2 + i * 17) % (span * 2);
      p.position.x = (i % 2 ? 20 : -40) + (u < span ? u : span * 2 - u);
      p.position.y = 1.2 + Math.abs(Math.sin(t * 5.5 + i)) * 0.04;
    });
    // The flock crosses the frame low over the water every minute and a half
    const cycle = 90;
    const u = (t % cycle) / cycle;
    const x = -520 + u * 1040;
    for (const b of birds) {
      b.bird.position.set(x + b.off.x, 34 + Math.sin(u * Math.PI) * 9 + b.off.y, 420 + b.off.z);
      // Pelicans flap a few beats, then glide
      const beat = Math.sin(t * 5.2 + b.phase);
      const glide = Math.sin(t * 0.35 + b.phase) > 0.2 ? 0.25 : 1;
      b.l.rotation.z = beat * 0.55 * glide + 0.08;
      b.r.rotation.z = -(beat * 0.55 * glide + 0.08);
    }
  });

  return <primitive object={group} />;
}

function Flood({ from, to, shadow }: { from: [number, number, number]; to: [number, number, number]; shadow: boolean }) {
  const light = useMemo(() => {
    const l = new THREE.SpotLight(LOOK.floodlight, LOOK.floodIntensity, 0, 0.5, 0.7, 2);
    l.position.set(...from);
    l.target.position.set(...to);
    if (shadow) {
      l.castShadow = true;
      l.shadow.mapSize.set(2048, 2048);
      l.shadow.camera.near = 20;
      l.shadow.camera.far = 420;
      l.shadow.bias = -0.0004;
      l.shadow.normalBias = 0.25;
    }
    return l;
    // from/to are stable per mast; keyed by value to avoid rebuilding every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.join(), to.join(), shadow]);
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
}

export default function GoldenShot({ onReady, shadows }: { onReady: () => void; shadows: boolean }) {
  const scene = useThree((s) => s.scene);
  const parts = useMemo(() => {
    const b = (LOOK.cameraBearingDeg * Math.PI) / 180;
    const cam = new THREE.Vector3(Math.sin(b) * LOOK.cameraDistance, 0, Math.cos(b) * LOOK.cameraDistance);
    const p = { stack: buildStack(), tower: buildTower(), site: buildSite(), ground: buildGround(), foreground: buildForeground(cam), afterglow: buildAfterglow(cam), lagoon: buildLagoon(cam, shadows) };
    for (const o of [p.stack, p.tower, p.site])
      o.traverse((m) => {
        m.castShadow = true;
        m.receiveShadow = true;
      });
    p.ground.traverse((m) => void (m.receiveShadow = true));
    return p;
  }, [shadows]);

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

  return (
    <>
      <primitive object={parts.ground} />
      <primitive object={parts.afterglow} />
      <primitive object={parts.lagoon} />
      <primitive object={parts.foreground} />
      <Life />
      <primitive object={parts.site} />
      <primitive object={parts.tower} />
      <primitive object={parts.stack} position={[0, PAD_H, 0]} />
      <Lights />
      <Vapour />
      {MASTS.map(([x, z], i) => (
        // The two masts on the camera side throw the shadows the lens can see
        <Flood key={i} from={[x, MAST_H, z]} to={[0, PAD_H + STACK_H * (i % 2 ? 0.7 : 0.35), 0]} shadow={shadows && i < 2} />
      ))}
    </>
  );
}
