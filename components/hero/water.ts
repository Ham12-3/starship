// Tidal lagoon between the camera and the pad. With `reflect` on it mirrors
// the whole scene (the lit stack, the lamps, the vapour) with a little ripple;
// otherwise it falls back to a glossy plane that only picks up the sky.
import * as THREE from "three/webgpu";
import { mx_noise_float, positionWorld, reflector, time, vec2, vec3 } from "three/tsl";

/** Lagoon edges, metres from the pad toward the camera. */
export const LAGOON_NEAR = 170;
export const LAGOON_FAR = 2900;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

export function buildLagoon(toward: THREE.Vector3, reflect: boolean) {
  const dir = toward.clone().setY(0).normalize();
  const holder = new THREE.Group();
  holder.rotation.y = Math.atan2(dir.x, dir.z); // local +Z now points at the camera

  const length = LAGOON_FAR - LAGOON_NEAR;
  const geo = new THREE.PlaneGeometry(9000, length);
  let material: THREE.Material;
  let target: THREE.Object3D | null = null;

  if (reflect) {
    const mirror: N = reflector({ resolutionScale: 0.5 });
    // Ripples: long across the view, short along it, drifting slowly. Seen at a
    // grazing angle this stretches lights into vertical streaks, as on real water.
    const p: N = positionWorld;
    const ripple = vec2(
      mx_noise_float(vec3(p.x.mul(0.035), p.z.mul(0.035), (time as N).mul(0.22))),
      mx_noise_float(vec3(p.x.mul(0.05).add(11.3), p.z.mul(0.05), (time as N).mul(0.3))),
    );
    mirror.uvNode = mirror.uvNode.add(ripple.mul(vec2(0.0016, 0.0042)));
    const m = new THREE.MeshBasicNodeMaterial();
    // Water never returns all the light: darken a little and add its own deep tone.
    m.colorNode = mirror.rgb.mul(0.72).add(vec3(0.004, 0.006, 0.01));
    material = m;
    target = mirror.target;
  } else {
    material = new THREE.MeshStandardMaterial({ color: "#0d1116", roughness: 0.06, metalness: 0 });
  }

  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.08, LAGOON_NEAR + length / 2);
  if (target) mesh.add(target);
  holder.add(mesh);
  return holder;
}
