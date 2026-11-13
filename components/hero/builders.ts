// Procedural look-dev stand-ins for the golden shot: Starship V3 stack, launch
// tower and pad. Built from the numbers in data/rockets.json and tuned for a
// long-lens view from kilometres away (about 0.2 m per pixel). These are NOT
// the hero model: Phase 2 replaces them with the Blender-built asset.
import * as THREE from "three/webgpu";
import rockets from "@/data/rockets.json";

const H = rockets.hero;
export const STACK_H = H.stackHeight.value;
export const BOOSTER_H = H.boosterHeight.value;
export const SHIP_H = STACK_H - BOOSTER_H;
export const R = H.diameter.value / 2;
/** Height of the launch mount deck above ground. Generic, not a measured value. */
export const PAD_H = 12;
export const TOWER_H = 146;
export const TOWER_X = -19;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function tex(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

interface SteelOpts {
  heightM: number;
  seed: number;
  /** Frosted bands in metres from the bottom: cryogenic tanks under load. */
  frost: [number, number][];
  /** Metres of heat tint and soot at the bottom. */
  soot: number;
  /** Metres of dark vent openings at the top (hot-staging ring). */
  vents: number;
}

/**
 * Stainless steel skin: welded 1.8 m rings that each catch the light a little
 * differently, weld seams, streaks, frost and heat tint. Returns a colour map
 * and a packed roughness (G) / metalness (B) map.
 */
function steelMaps(o: SteelOpts) {
  const W = 1024;
  const Hpx = 2048;
  const [cc, c] = canvas(W, Hpx);
  const [mc, m] = canvas(W, Hpx);
  const rand = rng(o.seed);
  const y = (metres: number) => Hpx - (metres / o.heightM) * Hpx; // canvas y for a height

  c.fillStyle = "#b4b7ba";
  c.fillRect(0, 0, W, Hpx);
  m.fillStyle = "rgb(0,92,255)";
  m.fillRect(0, 0, W, Hpx);

  // Rings
  const ring = 1.83;
  for (let h0 = 0; h0 < o.heightM; h0 += ring) {
    const top = y(Math.min(h0 + ring, o.heightM));
    const bot = y(h0);
    const v = Math.round(168 + rand() * 30);
    c.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    c.fillRect(0, top, W, bot - top);
    m.fillStyle = `rgb(0,${Math.round(70 + rand() * 55)},255)`;
    m.fillRect(0, top, W, bot - top);
    // Horizontal weld seam with a brighter ground band beside it
    c.fillStyle = "rgba(40,42,46,0.55)";
    c.fillRect(0, bot - 2, W, 2);
    c.fillStyle = "rgba(235,238,240,0.18)";
    c.fillRect(0, bot - 6, W, 3);
    // Vertical weld, staggered ring to ring
    const vx = Math.floor(rand() * W);
    c.fillStyle = "rgba(50,52,56,0.5)";
    c.fillRect(vx, top, 2, bot - top);
  }

  // Run-off streaks and handling marks
  for (let i = 0; i < 900; i++) {
    const x = rand() * W;
    const y0 = rand() * Hpx;
    const len = 20 + rand() * 260;
    const dark = rand() > 0.45;
    c.fillStyle = dark ? `rgba(30,30,34,${0.03 + rand() * 0.07})` : `rgba(255,255,255,${0.02 + rand() * 0.05})`;
    c.fillRect(x, y0, 1 + rand() * 3, len);
    m.fillStyle = `rgba(0,${dark ? 150 : 60},255,0.12)`;
    m.fillRect(x, y0, 2 + rand() * 4, len);
  }

  // Frost: sharp upper edge (the propellant level), ragged and patchy inside
  for (const [f0, f1] of o.frost) {
    const top = y(f1);
    const bot = y(f0);
    c.fillStyle = "rgba(196,203,212,0.9)";
    c.fillRect(0, top, W, bot - top);
    m.fillStyle = "rgb(0,225,30)";
    m.fillRect(0, top, W, bot - top);
    for (let i = 0; i < 2600; i++) {
      const x = rand() * W;
      const yy = top + rand() * (bot - top);
      const s = 3 + rand() * 26;
      c.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${rand() * 0.2})` : `rgba(150,158,168,${rand() * 0.22})`;
      c.fillRect(x, yy, s * 2.2, s * 0.6);
    }
    for (let h0 = Math.ceil(f0 / ring) * ring; h0 < f1; h0 += ring) {
      const rt = y(Math.min(h0 + ring, f1));
      const rb = y(h0);
      c.fillStyle = rand() > 0.5 ? `rgba(150,157,166,${0.08 + rand() * 0.2})` : `rgba(240,244,248,${0.05 + rand() * 0.14})`;
      c.fillRect(0, rt, W, rb - rt);
      c.fillStyle = "rgba(118,124,133,0.42)";
      c.fillRect(0, rb - 2, W, 2);
    }
    // Long vertical runs where ice has slid or melted
    for (let i = 0; i < 160; i++) {
      c.fillStyle = `rgba(135,142,152,${0.08 + rand() * 0.16})`;
      c.fillRect(rand() * W, top + rand() * (bot - top) * 0.8, 2 + rand() * 7, 40 + rand() * 260);
    }
    // Ragged lower edge where frost thins toward the tank dome
    for (let x = 0; x < W; x += 3) {
      const d = rand() * 26;
      c.fillStyle = "rgba(178,182,186,0.8)";
      c.fillRect(x, bot - d, 3, d);
      m.fillStyle = "rgb(0,110,255)";
      m.fillRect(x, bot - d, 3, d);
    }
  }

  // Heat tint and soot above the engines: straw, then blue, then dark
  if (o.soot > 0) {
    const top = y(o.soot);
    const g = c.createLinearGradient(0, top, 0, Hpx);
    g.addColorStop(0, "rgba(120,96,60,0)");
    g.addColorStop(0.35, "rgba(122,98,62,0.35)");
    g.addColorStop(0.7, "rgba(58,62,84,0.55)");
    g.addColorStop(1, "rgba(22,20,20,0.9)");
    c.fillStyle = g;
    c.fillRect(0, top, W, Hpx - top);
    const gm = m.createLinearGradient(0, top, 0, Hpx);
    gm.addColorStop(0, "rgba(0,120,255,0)");
    gm.addColorStop(1, "rgba(0,215,120,0.9)");
    m.fillStyle = gm;
    m.fillRect(0, top, W, Hpx - top);
  }

  // Hot-staging ring: slanted truss with dark openings between the members
  if (o.vents > 0) {
    const bot = y(o.heightM - o.vents);
    c.fillStyle = "#3d3f43";
    c.fillRect(0, 0, W, bot);
    m.fillStyle = "rgb(0,170,200)";
    m.fillRect(0, 0, W, bot);
    const n = 30;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W;
      c.fillStyle = "#07080a";
      c.beginPath();
      c.moveTo(x + 5, bot - 5);
      c.lineTo(x + W / n - 6, bot - 5);
      c.lineTo(x + W / n / 2, 7);
      c.closePath();
      c.fill();
    }
  }

  // Oil-canning: thin sheet between welds bows in and out, breaking up reflections
  const [bc, b] = canvas(512, 1024);
  b.fillStyle = "rgb(128,128,128)";
  b.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 420; i++) {
    const x = rand() * 512;
    const yy = rand() * 1024;
    const r = 14 + rand() * 46;
    const gr = b.createRadialGradient(x, yy, 0, x, yy, r);
    gr.addColorStop(0, rand() > 0.5 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)");
    gr.addColorStop(1, "rgba(128,128,128,0)");
    b.fillStyle = gr;
    b.fillRect(x - r, yy - r, r * 2, r * 2);
  }
  for (let h0 = 0; h0 < o.heightM; h0 += ring) {
    b.fillStyle = "rgba(255,255,255,0.5)";
    b.fillRect(0, 1024 - (h0 / o.heightM) * 1024 - 1.5, 512, 2);
  }
  return { map: tex(cc, true), orm: tex(mc, false), bump: tex(bc, false) };
}

function steelMaterial(o: SteelOpts) {
  const { map, orm, bump } = steelMaps(o);
  return new THREE.MeshStandardMaterial({ map, roughnessMap: orm, metalnessMap: orm, bumpMap: bump, bumpScale: 1.4, roughness: 1, metalness: 1 });
}

/** Heat-shield tiles: near-black, slightly uneven, a few newer and chipped ones. */
function tileMaterial() {
  const [cc, c] = canvas(512, 1024);
  const rand = rng(77);
  c.fillStyle = "#101114";
  c.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 9000; i++) {
    const v = Math.round(10 + rand() * 12);
    c.fillStyle = `rgba(${v},${v},${v + 3},0.6)`;
    c.fillRect(rand() * 512, rand() * 1024, 5, 5);
  }
  for (let i = 0; i < 22; i++) {
    c.fillStyle = rand() > 0.6 ? "rgba(70,72,78,0.8)" : "rgba(150,146,138,0.55)";
    c.fillRect(rand() * 512, rand() * 1024, 2, 2);
  }
  return new THREE.MeshStandardMaterial({ map: tex(cc, true), roughness: 0.62, metalness: 0 });
}

function shipProfile() {
  const barrel = 33;
  const pts: THREE.Vector2[] = [new THREE.Vector2(R, 0), new THREE.Vector2(R, barrel)];
  const n = 28;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector2(Math.max(R * Math.pow(1 - Math.pow(t, 2.1), 0.72), 0.05), barrel + (SHIP_H - barrel) * t));
  }
  return pts;
}

function flap(height: number, span: number, taper: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(span, height * 0.08);
  s.lineTo(span * taper, height);
  s.lineTo(0, height);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false });
  g.translate(0, 0, -0.25);
  return g;
}

/** Full stack. Origin at the base of the booster. Heat shield faces +X (away from the tower). */
export function buildStack() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: "#2a2c30", roughness: 0.55, metalness: 0.9 });
  const tiles = tileMaterial();

  // Booster. Methane tank low, oxygen tank above it, both loaded and frosted.
  const boosterMat = steelMaterial({ heightM: BOOSTER_H, seed: 11, frost: [[5, 27], [29.5, 62]], soot: 4.5, vents: 2.6 });
  const booster = new THREE.Mesh(new THREE.CylinderGeometry(R, R, BOOSTER_H, 96, 1, true), boosterMat);
  booster.position.y = BOOSTER_H / 2;
  g.add(booster);

  // Chines: four raised covers up the lower booster
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const chine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 21, 0.9), dark);
    chine.position.set(Math.cos(a) * (R + 0.3), 13, Math.sin(a) * (R + 0.3));
    chine.rotation.y = -a + Math.PI / 2;
    g.add(chine);
  }

  // Three grid fins (Block 3), 90 degrees apart, none on the tower side
  for (const a of [0, Math.PI / 2, -Math.PI / 2]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 5.4), dark);
    fin.position.set(Math.cos(a) * (R + 3.3), BOOSTER_H - 8, Math.sin(a) * (R + 3.3));
    fin.rotation.y = -a;
    g.add(fin);
  }

  // Ship
  const ship = new THREE.Group();
  ship.position.y = BOOSTER_H;
  const shipMat = steelMaterial({ heightM: SHIP_H, seed: 23, frost: [[3.5, 15], [17, 29]], soot: 0, vents: 0 });
  const profile = shipProfile();
  ship.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 96), shipMat));
  // Windward half wrapped in tiles. Lathe angle 0 is +Z, so centre the half on +X.
  const shield = new THREE.Mesh(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p.x + 0.04, p.y)), 64, 0, Math.PI), tiles);
  ship.add(shield);
  // Flaps sit on the edge between steel and tiles, hinged along the body
  const aft = flap(13, 5.6, 0.55);
  const fwd = flap(8.5, 4.2, 0.35);
  for (const side of [1, -1]) {
    const a = new THREE.Mesh(aft, tiles);
    a.position.set(0.6, 1.2, side * (R - 0.2));
    a.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    ship.add(a);
    const f = new THREE.Mesh(fwd, tiles);
    f.position.set(-0.8, 35.5, side * (R - 0.9));
    f.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    ship.add(f);
  }
  g.add(ship);
  return g;
}

/** Lattice launch tower with catch arms. Generic, inspired-by, not a blueprint. */
export function buildTower() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#17191c", roughness: 0.7, metalness: 0.6 });
  const W = 12;
  const bay = 6;
  const levels = Math.floor(TOWER_H / bay);
  const boxes: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const add = (a: THREE.Vector3, b: THREE.Vector3, t: number) => {
    const d = new THREE.Vector3().subVectors(b, a);
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    m.compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(t, d.length(), t));
    boxes.push(m.clone());
  };
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, z]) => new THREE.Vector3((x * W) / 2, 0, (z * W) / 2));
  for (const c of corners) add(c, c.clone().setY(TOWER_H), 1.3);
  for (let l = 0; l < levels; l++) {
    for (let s = 0; s < 4; s++) {
      const a = corners[s].clone().setY(l * bay);
      const b = corners[(s + 1) % 4].clone().setY(l * bay);
      add(a.clone().setY((l + 1) * bay), b.clone().setY((l + 1) * bay), 0.5);
      add(a, b.clone().setY((l + 1) * bay), 0.36);
      add(b, a.clone().setY((l + 1) * bay), 0.36);
    }
  }
  // Secondary structure: what makes a real tower read as dense, not as a diagram.
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // Lift shaft and stair core
  add(V(-2, 0, -2), V(-2, TOWER_H, -2), 3.2);
  // Zig-zag stairs up the back face
  for (let l = 0; l < levels; l++) add(V(-W / 2 - 0.6, l * bay, l % 2 ? -5 : 5), V(-W / 2 - 0.6, (l + 1) * bay, l % 2 ? 5 : -5), 0.3);
  // Propellant and purge lines, in bundles, up the face nearest the rocket
  for (let i = 0; i < 9; i++) {
    const z = -4.6 + i * 1.15 + (i % 3 === 0 ? 0.3 : 0);
    const top = i < 4 ? PAD_H + BOOSTER_H + 8 : i < 7 ? PAD_H + 6 + i * 9 : TOWER_H - 4;
    add(V(W / 2 + 0.7, 0, z), V(W / 2 + 0.7, top, z), i % 2 ? 0.42 : 0.26);
  }
  // Cable trays on the side faces
  for (const z of [-W / 2 - 0.5, W / 2 + 0.5]) for (const x of [-3, 1.5, 3.4]) add(V(x, 0, z), V(x, TOWER_H - 10, z), 0.3);
  // Work platforms with handrails
  for (let y = 12; y < TOWER_H; y += 18) {
    for (const z of [-W / 2 - 1.1, W / 2 + 1.1]) {
      add(V(-W / 2 - 1, y, z), V(W / 2 + 1, y, z), 0.5);
      add(V(-W / 2 - 1, y + 1.1, z), V(W / 2 + 1, y + 1.1, z), 0.09);
    }
  }
  // Catch arms: open trusses, hinged at the carriage, parked either side of the stack
  const armY0 = PAD_H + 61;
  for (const side of [1, -1]) {
    const z0 = side * 6.5;
    const z1 = side * 10.5;
    const x0 = W / 2 + 2;
    const x1 = W / 2 + 37;
    const P = (t: number, dy: number, dz: number) => V(x0 + (x1 - x0) * t, armY0 + dy * (1 - t * 0.35), z0 + (z1 - z0) * t + dz);
    const n = 9;
    for (const dz of [-0.9, 0.9]) {
      add(P(0, 1.6, dz), P(1, 1.6, dz), 0.55);
      add(P(0, -1.6, dz), P(1, -1.6, dz), 0.55);
      for (let i = 0; i < n; i++) {
        add(P(i / n, -1.6, dz), P((i + 1) / n, 1.6, dz), 0.26);
        add(P(i / n, 1.6, dz), P(i / n, -1.6, dz), 0.22);
      }
    }
    for (let i = 0; i <= n; i++) add(P(i / n, 1.6, -0.9), P(i / n, 1.6, 0.9), 0.22);
    // Landing rail along the inner top edge
    add(P(0.3, 2.1, -side * 0.9), P(1, 2.1, -side * 0.9), 0.4);
  }
  // Hoist cables from the tower head down to the carriage
  for (const z of [-3, 3]) add(V(W / 2 + 1.4, armY0 + 4, z), V(W / 2 + 1.4, TOWER_H, z), 0.12);
  // Ship arm as a truss with a drooping hose bundle
  {
    const y = PAD_H + BOOSTER_H + 6;
    for (const dy of [-1.5, 1.5]) for (const dz of [-3, 0]) add(V(W / 2, y + dy, dz), V(W / 2 + 14.5, y + dy, dz), 0.4);
    for (let i = 0; i < 6; i++) add(V(W / 2 + i * 2.4, y - 1.5, 0), V(W / 2 + (i + 1) * 2.4, y + 1.5, 0), 0.22);
    const sag = (i: number) => y - 1.7 - Math.sin((i / 5) * Math.PI) * 1.6;
    for (let i = 0; i < 5; i++) add(V(W / 2 + 2 + i * 2.5, sag(i), -1.5), V(W / 2 + 4.5 + i * 2.5, sag(i + 1), -1.5), 0.3);
  }
  // Crane jib on the tower head
  add(V(-2, TOWER_H + 3, 0), V(9, TOWER_H + 7, 0), 0.5);
  add(V(-2, TOWER_H + 3, 0), V(-2, TOWER_H + 8, 0), 0.5);
  add(V(-2, TOWER_H + 8, 0), V(9, TOWER_H + 7, 0), 0.2);

  const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, boxes.length);
  boxes.forEach((b, i) => lattice.setMatrixAt(i, b));
  g.add(lattice);

  const box = (w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z);
    b.rotation.y = ry;
    g.add(b);
    return b;
  };
  // Carriage and the two catch arms, parked open either side of the stack
  const armY = PAD_H + 61;
  box(3, 9, 16, W / 2 + 1.2, armY, 0);
  // Ship quick-disconnect arm
  box(2.6, 4, 4.2, W / 2 + 14.2, PAD_H + BOOSTER_H + 6, -1.5);
  // Booster quick-disconnect hood near the base
  box(11, 5, 4, W / 2 + 4.5, PAD_H + 3, 0);
  // Cap and lightning rod
  box(W + 2, 3, W + 2, 0, TOWER_H + 1.5, 0);
  box(0.5, 13, 0.5, 0, TOWER_H + 9.5, 0);

  g.position.x = TOWER_X - W / 2;
  return g;
}

/** Launch mount, tank farm, light masts and a few vehicles for scale. */
export function buildSite() {
  const g = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: "#6f6b64", roughness: 0.92 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: "#26282b", roughness: 0.6, metalness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: "#c9cdd0", roughness: 0.45, metalness: 0.1 });
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };

  // Launch mount: deck on two walls with the flame trench between them
  put(new THREE.BoxGeometry(32, 4, 30), darkSteel, 0, PAD_H - 2, 0);
  for (const z of [-11, 11]) put(new THREE.BoxGeometry(44, PAD_H - 4, 7), concrete, 0, (PAD_H - 4) / 2, z);
  put(new THREE.BoxGeometry(70, 1.2, 60), concrete, 0, 0.6, 0);
  // Flame deflector ramp
  const ramp = put(new THREE.BoxGeometry(30, 1.5, 14), concrete, 30, 4, 0);
  ramp.rotation.z = -0.3;

  // Tank farm: tall vertical tanks and low horizontal ones
  const rand = rng(5);
  for (let i = 0; i < 9; i++) {
    const h = 28 + Math.floor(rand() * 3) * 6;
    const x = 115 + i * 15.5;
    put(new THREE.CylinderGeometry(4.6, 4.6, h, 32), white, x, h / 2, -40 - (i % 2) * 14);
    put(new THREE.SphereGeometry(4.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), white, x, h, -40 - (i % 2) * 14);
  }
  for (let i = 0; i < 6; i++) {
    const t = put(new THREE.CylinderGeometry(2.2, 2.2, 22, 20), white, 128 + i * 9, 3.4, 8);
    t.rotation.x = Math.PI / 2;
  }
  put(new THREE.BoxGeometry(190, 4.5, 2), concrete, 185, 2.25, 26); // blast wall

  // Low support buildings and stacked containers
  for (let i = 0; i < 7; i++) {
    const w = 10 + rand() * 22;
    const h = 3 + rand() * 7;
    put(new THREE.BoxGeometry(w, h, 10), i % 2 ? concrete : darkSteel, -90 - i * 34 + rand() * 10, h / 2, -30 + rand() * 60);
  }

  // Pickup trucks: about 5.8 m long, 1.9 m tall
  const truck = new THREE.MeshStandardMaterial({ color: "#d8d8d4", roughness: 0.5 });
  for (const [x, z] of [
    [62, 40],
    [-58, 46],
    [150, 52],
  ]) {
    put(new THREE.BoxGeometry(5.8, 1.0, 2), truck, x, 1.0, z);
    put(new THREE.BoxGeometry(2.4, 0.9, 1.9), truck, x - 0.4, 1.9, z);
  }

  // Light masts
  for (const [x, z] of MASTS) {
    put(new THREE.CylinderGeometry(0.35, 0.5, MAST_H, 8), darkSteel, x, MAST_H / 2, z);
    put(new THREE.BoxGeometry(5, 2.2, 1), darkSteel, x, MAST_H + 1, z);
  }
  return g;
}

export const MAST_H = 42;
export const MASTS: [number, number][] = [
  [70, 62],
  [-64, 58],
  [96, -70],
  [-80, -60],
];

/** Coastal flats: dark scrub and mud with standing water that mirrors the sky. */
export function buildGround() {
  const size = 2048;
  const [cc, c] = canvas(size, size);
  const [mc, m] = canvas(size, size);
  const rand = rng(91);
  c.fillStyle = "#2c2b24";
  c.fillRect(0, 0, size, size);
  m.fillStyle = "rgb(0,240,0)";
  m.fillRect(0, 0, size, size);
  for (let i = 0; i < 26000; i++) {
    const v = rand();
    c.fillStyle = v > 0.5 ? `rgba(58,60,40,${0.25 * rand()})` : `rgba(18,17,15,${0.3 * rand()})`;
    const s = 2 + rand() * 14;
    c.fillRect(rand() * size, rand() * size, s * 2, s);
  }
  // Standing water: long shallow pools
  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = 8 + rand() * 90;
    const ry = 2 + rand() * 12;
    c.fillStyle = "rgba(20,24,30,0.9)";
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    m.fillStyle = "rgb(0,14,0)";
    m.beginPath();
    m.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    m.fill();
  }
  const map = tex(cc, true);
  const orm = tex(mc, false);
  const mat = new THREE.MeshStandardMaterial({ map, roughnessMap: orm, roughness: 1, metalness: 0 });
  const g = new THREE.Group();
  const near = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mat);
  near.rotation.x = -Math.PI / 2;
  g.add(near);
  const far = new THREE.Mesh(new THREE.CircleGeometry(60000, 48), new THREE.MeshStandardMaterial({ color: "#24231f", roughness: 1 }));
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.5;
  g.add(far);
  return g;
}

/** Soft, irregular puff used for venting vapour. */
export function puffTexture(seed: number) {
  const s = 128;
  const [cc, c] = canvas(s, s);
  const rand = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = s / 2 + (rand() - 0.5) * s * 0.5;
    const y = s / 2 + (rand() - 0.5) * s * 0.5;
    const r = s * (0.1 + rand() * 0.2);
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255,0.22)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, s, s);
  }
  const t = new THREE.CanvasTexture(cc);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Foreground between the camera and the pad: low dunes with dark scrub and a
 * line of utility poles. Gives the long lens something near to compress
 * against the pad. `toward` is the camera position on the ground.
 */
export function buildForeground(toward: THREE.Vector3) {
  const g = new THREE.Group();
  const rand = rng(404);
  const dir = toward.clone().setY(0).normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  const dist = toward.length();
  const sand = new THREE.MeshStandardMaterial({ color: "#3b382e", roughness: 1 });
  const scrub = new THREE.MeshStandardMaterial({ color: "#161a12", roughness: 1 });
  const dunes: THREE.Matrix4[] = [];
  const bushes: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 70; i++) {
    const d = 380 + Math.pow(rand(), 1.4) * 760;
    const lateral = (rand() - 0.5) * (220 + d * 0.16);
    const p = dir.clone().multiplyScalar(d).addScaledVector(side, lateral);
    const w = 30 + rand() * 110;
    const h = 0.8 + rand() * 3.6 * Math.min(1, d / 1500);
    q.setFromAxisAngle(up, rand() * Math.PI);
    m.compose(new THREE.Vector3(p.x, -0.1, p.z), q, new THREE.Vector3(w, h, w * (0.3 + rand() * 0.4)));
    dunes.push(m.clone());
    const n = 3 + Math.floor(rand() * 9);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.75;
      const sz = 0.6 + rand() * 1.8;
      m.compose(
        new THREE.Vector3(p.x + Math.cos(a) * r * w * 0.6, h * (1 - r * r) * 0.9, p.z + Math.sin(a) * r * w * 0.25),
        q,
        new THREE.Vector3(sz * (1 + rand()), sz * 0.7, sz),
      );
      bushes.push(m.clone());
    }
  }
  for (let i = 0; i < 260; i++) {
    const lateral = (rand() - 0.5) * 1500;
    const p = dir.clone().multiplyScalar(150 + rand() * 26).addScaledVector(side, lateral);
    const sz = 0.5 + rand() * 1.6;
    q.setFromAxisAngle(up, rand() * Math.PI);
    m.compose(new THREE.Vector3(p.x, sz * 0.3, p.z), q, new THREE.Vector3(sz * (1.5 + rand() * 2), sz * 0.6, sz));
    bushes.push(m.clone());
  }
  const duneMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), sand, dunes.length);
  dunes.forEach((d, i) => duneMesh.setMatrixAt(i, d));
  const bushMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), scrub, bushes.length);
  bushes.forEach((d, i) => bushMesh.setMatrixAt(i, d));
  g.add(duneMesh, bushMesh);

  const pole = new THREE.MeshStandardMaterial({ color: "#1c1a17", roughness: 0.9 });
  for (let i = 0; i < 14; i++) {
    const p = dir.clone().multiplyScalar(260 + i * 85).addScaledVector(side, 150 - i * 4);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 11, 6), pole);
    post.position.set(p.x, 5.5, p.z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.14), pole);
    arm.position.set(p.x, 10.3, p.z);
    arm.rotation.y = Math.atan2(side.x, side.z) + Math.PI / 2;
    g.add(post, arm);
  }
  return g;
}

/** Lamp glint: a soft core with thin diffraction spikes, as a stopped-down long lens draws it. */
export function glintTexture() {
  const s = 256;
  const [cc, c] = canvas(s, s);
  const core = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.06, "rgba(255,246,230,0.55)");
  core.addColorStop(0.25, "rgba(255,240,220,0.035)");
  core.addColorStop(1, "rgba(255,240,220,0)");
  c.fillStyle = core;
  c.fillRect(0, 0, s, s);
  c.translate(s / 2, s / 2);
  for (let i = 0; i < 6; i++) {
    c.rotate(Math.PI / 3);
    const sp = c.createLinearGradient(0, 0, s / 2, 0);
    sp.addColorStop(0, "rgba(255,250,240,0.55)");
    sp.addColorStop(1, "rgba(255,250,240,0)");
    c.fillStyle = sp;
    c.fillRect(0, -0.7, s / 2, 1.4);
  }
  const t = new THREE.CanvasTexture(cc);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Afterglow: the band of warm light that sits on the horizon after sunset and
 * fades into the cooler sky above. A captured sky at this lens length is too
 * coarse to carry it, so it is painted on a distant card behind the pad.
 * `toward` is the camera position on the ground.
 */
export function buildAfterglow(toward: THREE.Vector3) {
  const [cc, c] = canvas(8, 512);
  const g = c.createLinearGradient(0, 512, 0, 0);
  g.addColorStop(0, "rgba(236,170,128,0.62)");
  g.addColorStop(0.1, "rgba(226,160,132,0.5)");
  g.addColorStop(0.3, "rgba(170,150,160,0.24)");
  g.addColorStop(0.62, "rgba(96,140,156,0.1)");
  g.addColorStop(1, "rgba(96,140,156,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 8, 512);
  const map = new THREE.CanvasTexture(cc);
  map.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(60000, 1500), mat);
  const dir = toward.clone().setY(0).normalize();
  card.position.copy(dir).multiplyScalar(-14000).setY(750 - 20);
  card.lookAt(toward.x, 730, toward.z);
  card.renderOrder = -1;
  return card;
}
