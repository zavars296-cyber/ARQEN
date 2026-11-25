import * as THREE from 'three';
import { U } from './common.js';

// Rain streaks that wrap around the camera so a fixed number of drops
// always fills the view.
export function buildRain(rng, count) {
  const B = 70, H = 46;
  const off = new Float32Array(count * 2 * 3);
  const end = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = rng() * B, y = rng() * H, z = rng() * B;
    for (let k = 0; k < 2; k++) {
      off.set([x, y, z], (i * 2 + k) * 3);
      end[i * 2 + k] = k;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(off, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime },
    vertexShader: /* glsl */ `
      uniform float uTime; attribute float aEnd; varying float vA;
      void main(){
        vec3 o = position;
        vec3 c = cameraPosition;
        vec3 p;
        p.x = c.x + mod(o.x - c.x, ${B.toFixed(1)}) - ${(B / 2).toFixed(1)};
        p.z = c.z + mod(o.z - c.z, ${B.toFixed(1)}) - ${(B / 2).toFixed(1)};
        p.y = c.y - ${(H * 0.45).toFixed(1)} + mod(o.y - uTime*38.0 - c.y, ${H.toFixed(1)});
        p.y = max(p.y, 0.0);
        p.x += aEnd * 0.25; p.y += aEnd * 1.4;
        float d = length(p - c);
        vA = smoothstep(${(B / 2).toFixed(1)}, 4.0, d) * smoothstep(0.5, 3.0, d) * (0.35 + 0.65*aEnd);
        gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){ gl_FragColor = vec4(vec3(0.55,0.7,1.0) * vA * 0.55, 1.0); }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 5;
  return lines;
}
