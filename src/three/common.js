import * as THREE from 'three';

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

export const COLORS = {
  blue: '#3b6dff',
  violet: '#8a5cff',
  cyan: '#5be4ff',
  white: '#f3f5ff',
};

// A dark studio with soft boxes in the brand colours. Used as the reflection
// environment for every metallic and glass surface.
export function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#030308');
  const box = (color, k, w, h, pos, look = [0, 0, 0]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.lookAt(...look);
    s.add(m);
  };
  box('#ffffff', 3.2, 9, 1.8, [-2, 6, 3]); // key strip
  box('#ffffff', 1.1, 12, 5, [0, 8, -2]); // top softbox
  box('#dfe4ff', 1.4, 3, 6, [-4, 1, 6]); // front-left fill
  box(COLORS.blue, 3.0, 2.2, 8, [7, 0.5, -1]); // right blue
  box(COLORS.violet, 3.0, 2.2, 8, [-7, 0, -1]); // left violet
  box(COLORS.cyan, 1.6, 6, 0.4, [0, -3, 6]); // low cyan rim
  box('#ffffff', 0.6, 10, 10, [0, 2, -8]); // faint back
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return tex;
}

let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d').createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.45)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.08)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  const ctx = c.getContext('2d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  _glow = new THREE.CanvasTexture(c);
  _glow.colorSpace = THREE.SRGBColorSpace;
  return _glow;
}

export const neon = (c, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });

// Soft additive dust used in several scenes.
export function particles(count, spread, colors, size = 0.05, seed = 3) {
  const rng = mulberry32(seed);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(rng() - 0.5) * spread[0], (rng() - 0.5) * spread[1], (rng() - 0.5) * spread[2]], i * 3);
    new THREE.Color(colors[i % colors.length]).toArray(col, i * 3);
    ph[i] = rng() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uTime: { value: 0 }, uSize: { value: size }, uPR: { value: 1 }, uH: { value: spread[1] } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSize; uniform float uPR; uniform float uH;
      attribute float aPh; varying vec3 vC; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime*0.08 + uH*0.5, uH) - uH*0.5;
        p.x += sin(uTime*0.2 + aPh)*0.15;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        gl_PointSize = uSize * uPR * 600.0 / -mv.z;
        vC = color;
        vA = 0.35 + 0.65*pow(0.5+0.5*sin(uTime*1.3 + aPh*3.0), 3.0);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d);
        gl_FragColor = vec4(vC*a*vA, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}
