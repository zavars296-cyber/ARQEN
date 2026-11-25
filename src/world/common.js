import * as THREE from 'three';

// Shared uniforms so every custom shader sees the same time and fog.
export const U = {
  uTime: { value: 0 },
  uFogColor: { value: new THREE.Color('#120a26') },
  uFogDensity: { value: 0.0042 },
};

export const GLSL_COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float fogFactor(vec3 world){
  float d = length(world - cameraPosition);
  return 1.0 - exp(-d*d*uFogDensity*uFogDensity);
}
`;

// Seeded RNG so the city is the same for every visitor.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OUTPUT = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;
