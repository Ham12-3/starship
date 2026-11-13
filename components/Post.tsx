"use client";

// The "it was filmed" pass: everything a long lens, warm air and a real sensor
// would add. One pipeline for both WebGPU and the WebGL2 fallback (TSL).
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { dot, float, floor, fract, length, mix, mx_noise_float, pass, renderOutput, screenUV, sin, smoothstep, time, uniform, vec2, vec3, vec4 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { TIERS, type TierName } from "@/lib/quality";

export const GRADE = {
  /** Heat shimmer, in screen fractions. Strongest near the ground. */
  shimmer: 0.0006,
  chromaticAberration: 0.004,
  bloomStrength: 0.55,
  bloomRadius: 0.5,
  bloomThreshold: 1.6,
  vignette: 0.3,
  grain: 0.045,
  /** Lifted blacks: haze and veiling glare never leave a true black. */
  lift: 0.018,
  /** Warm highlights, cool shadows. */
  warmth: 0.035,
  saturation: 0.9,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

function buildPipeline(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera, tier: TierName) {
  const post = TIERS[tier].post;
  const pipeline = new THREE.RenderPipeline(renderer);
  pipeline.outputColorTransform = false; // tonemapping is done by hand below, before grain

  const scenePass = pass(scene, camera);
  const src: N = scenePass.getTextureNode("output");

  // Heat shimmer: rising, fine-grained refraction, masked to the lower frame.
  const t: N = time;
  const uvN: N = screenUV;
  const n = vec2(
    mx_noise_float(vec3(uvN.x.mul(140), uvN.y.mul(60).add(t.mul(0.9)), t.mul(0.5))),
    mx_noise_float(vec3(uvN.x.mul(110).add(31.7), uvN.y.mul(75).add(t.mul(0.8)), t.mul(0.45))),
  );
  const nearGround = smoothstep(0.3, 0.95, uvN.y).add(0.25);
  const uvS = uvN.add(n.mul(uniform(GRADE.shimmer)).mul(nearGround));

  // Lateral chromatic aberration: grows toward the frame edge.
  const c = uvN.sub(0.5);
  const ca = c.mul(dot(c, c)).mul(uniform(GRADE.chromaticAberration));
  let col: N = vec3(src.sample(uvS.add(ca)).r, src.sample(uvS).g, src.sample(uvS.sub(ca)).b);

  if (post.bloom) col = col.add((bloom(src, GRADE.bloomStrength, GRADE.bloomRadius, GRADE.bloomThreshold) as N).rgb);

  // Vignette (scene-referred, like real light fall-off)
  col = col.mul(mix(float(1 - GRADE.vignette), float(1), smoothstep(0.85, 0.2, length(c))));

  // Tonemap (AgX, from the renderer) and convert to display colour
  let out: N = renderOutput(vec4(col, 1)).rgb;

  // Grade: restrained saturation, warm highlights over cool shadows, lifted blacks
  const luma = dot(out, vec3(0.2126, 0.7152, 0.0722));
  out = mix(vec3(luma), out, float(GRADE.saturation));
  out = out.add(mix(vec3(-0.6, 0, 1), vec3(1, 0.25, -0.8), luma).mul(GRADE.warmth).mul(luma.oneMinus().mul(luma).mul(4)));
  out = out.mul(1 - GRADE.lift).add(GRADE.lift);

  // Film grain: luminance only, new pattern 24 times a second, weaker in highlights
  if (post.grain) {
    const frame = floor(t.mul(24));
    const g = fract(sin(dot(uvN.add(frame.mul(0.0137)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5);
    out = out.add(g.mul(GRADE.grain).mul(luma.oneMinus().mul(0.7).add(0.3)));
  }

  pipeline.outputNode = vec4(out, 1);
  return pipeline;
}

export default function Post({ tier }: { tier: TierName }) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const pipeline = useMemo(() => buildPipeline(gl, scene, camera, tier), [gl, scene, camera, tier]);
  useEffect(() => () => pipeline.dispose(), [pipeline]);
  // A positive priority takes over rendering from React Three Fiber.
  useFrame(() => pipeline.render(), 1);
  return null;
}
