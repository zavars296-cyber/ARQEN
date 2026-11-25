import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { U, GLSL_COMMON, OUTPUT } from './common.js';
import { NEON } from './textures.js';
import { BOUND } from './city.js';

const pick = (rng, a) => a[Math.floor(rng() * a.length)];

// Tag every vertex of a geometry with a part id (used by shaders).
function part(geo, id) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  g.setAttribute('part', new THREE.Float32BufferAttribute(new Float32Array(n).fill(id), 1));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'part'].includes(k)) g.deleteAttribute(k);
  return g;
}
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// ---------------------------------------------------------------------------
// Flying traffic
// ---------------------------------------------------------------------------
function carGeometry() {
  const parts = [
    part(box(2.2, 0.8, 4.8, 0, 0, 0), 0),
    part(box(1.7, 0.6, 2.4, 0, 0.62, -0.3), 0),
    part(box(1.9, 0.18, 0.08, 0, 0.1, 2.42), 1), // headlights
    part(box(2.0, 0.16, 0.08, 0, 0.12, -2.42), 2), // tail lights
    part(box(0.08, 0.1, 4.2, 1.12, -0.25, 0), 3), // side neon strips
    part(box(0.08, 0.1, 4.2, -1.12, -0.25, 0), 3),
    part(box(1.6, 0.04, 3.6, 0, -0.45, 0), 3), // underglow
  ];
  return mergeGeometries(parts);
}

function vehicleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...U },
    vertexShader: /* glsl */ `
      attribute float part; attribute vec3 aTint;
      varying float vPart; varying vec3 vTint; varying vec3 vWorld; varying vec3 vN;
      void main(){
        vPart = part; vTint = aTint;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.0);
        vWorld = wp.xyz; vN = normalize(mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      varying float vPart; varying vec3 vTint; varying vec3 vWorld; varying vec3 vN;
      void main(){
        vec3 c;
        if (vPart < 0.5) c = vec3(0.03,0.03,0.05) + vec3(0.08,0.06,0.14)*max(vN.y,0.0) + vTint*0.05;
        else if (vPart < 1.5) c = vec3(2.2,2.3,2.6);
        else if (vPart < 2.5) c = vec3(2.6,0.15,0.25);
        else c = vTint * 1.8;
        c = mix(c, uFogColor, fogFactor(vWorld));
        gl_FragColor = vec4(c,1.0);
        ${OUTPUT}
      }`,
  });
}

export class Traffic {
  constructor(rng, count) {
    this.cars = [];
    const lanesC = [-125, -75, -25, 0, 25, 75, 125];
    const alts = [19, 26, 34, 46, 60, 78];
    for (let i = 0; i < count; i++) {
      this.cars.push({
        axis: rng() < 0.5 ? 0 : 1,
        c: pick(rng, lanesC) + (rng() < 0.5 ? -3 : 3),
        alt: pick(rng, alts) + (rng() - 0.5) * 2,
        dir: rng() < 0.5 ? -1 : 1,
        speed: 16 + rng() * 26,
        off: rng() * 680,
        bob: rng() * 10,
      });
    }
    const geo = carGeometry();
    const tint = new Float32Array(count * 3);
    this.cars.forEach((c, i) => new THREE.Color(pick(rng, NEON)).toArray(tint, i * 3));
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    this.mesh = new THREE.InstancedMesh(geo, vehicleMaterial(), count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._e = new THREE.Euler();
  }
  update(t) {
    const { _m, _q, _p, _s, _e } = this;
    this.cars.forEach((c, i) => {
      let s = ((c.off + t * c.speed * c.dir) % 680 + 680) % 680 - 340;
      const y = c.alt + Math.sin(t * 0.8 + c.bob) * 0.6;
      if (c.axis === 0) _p.set(s, y, c.c);
      else _p.set(c.c, y, s);
      const yaw = c.axis === 0 ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : c.dir > 0 ? 0 : Math.PI;
      _q.setFromEuler(_e.set(0, yaw, Math.sin(t + c.bob) * 0.05));
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Pedestrians and robots: one shader animates legs/arms per instance.
// part ids: 0 body, 1 left leg, 2 right leg, 3 left arm, 4 right arm,
// 5 neon accent, 6 umbrella canopy, 7 umbrella rim/handle, 8 visor/eye
// ---------------------------------------------------------------------------
function humanGeometry() {
  const canopy = new THREE.ConeGeometry(0.85, 0.35, 10, 1, true).translate(0, 2.35, 0);
  const rim = new THREE.TorusGeometry(0.85, 0.025, 4, 16).rotateX(Math.PI / 2).translate(0, 2.18, 0);
  return mergeGeometries([
    part(box(0.46, 0.66, 0.26, 0, 1.28, 0), 0),
    part(box(0.36, 0.2, 0.24, 0, 0.9, 0), 0),
    part(box(0.2, 0.24, 0.2, 0, 1.76, 0), 0),
    part(box(0.17, 0.86, 0.17, -0.11, 0.43, 0), 1),
    part(box(0.17, 0.86, 0.17, 0.11, 0.43, 0), 2),
    part(box(0.12, 0.62, 0.12, -0.3, 1.3, 0), 3),
    part(box(0.12, 0.62, 0.12, 0.3, 1.3, 0), 4),
    part(box(0.47, 0.05, 0.27, 0, 1.42, 0), 5),
    part(box(0.18, 0.05, 0.05, 0, 1.79, 0.1), 8),
    part(canopy, 6),
    part(rim, 7),
    part(box(0.03, 0.9, 0.03, 0.3, 1.8, 0), 7),
  ]);
}

function robotGeometry() {
  return mergeGeometries([
    part(box(0.8, 0.9, 0.55, 0, 1.55, 0), 0),
    part(box(0.5, 0.4, 0.45, 0, 2.25, 0), 0),
    part(box(0.42, 0.08, 0.05, 0, 2.28, 0.24), 8),
    part(box(0.25, 1.1, 0.25, -0.22, 0.55, 0), 1),
    part(box(0.25, 1.1, 0.25, 0.22, 0.55, 0), 2),
    part(box(0.18, 0.85, 0.18, -0.52, 1.5, 0), 3),
    part(box(0.18, 0.85, 0.18, 0.52, 1.5, 0), 4),
    part(box(0.82, 0.06, 0.57, 0, 1.25, 0), 5),
    part(box(0.04, 0.5, 0.04, 0.15, 2.7, 0), 7),
  ]);
}

function dogGeometry() {
  // four-legged courier bot
  return mergeGeometries([
    part(box(0.55, 0.35, 1.2, 0, 0.75, 0), 0),
    part(box(0.35, 0.28, 0.35, 0, 0.95, 0.7), 0),
    part(box(0.3, 0.06, 0.04, 0, 0.98, 0.88), 8),
    part(box(0.12, 0.6, 0.12, -0.22, 0.3, 0.45), 1),
    part(box(0.12, 0.6, 0.12, 0.22, 0.3, -0.45), 1),
    part(box(0.12, 0.6, 0.12, 0.22, 0.3, 0.45), 2),
    part(box(0.12, 0.6, 0.12, -0.22, 0.3, -0.45), 2),
    part(box(0.57, 0.05, 1.22, 0, 0.82, 0), 5),
  ]);
}

function walkerMaterial(hipY, shoulderY, stride) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U },
    vertexShader: /* glsl */ `
      ${'uniform float uTime;'}
      attribute float part; attribute vec3 aTint; attribute float aPhase; attribute float aUmb; attribute float aMove;
      varying float vPart; varying vec3 vTint; varying vec3 vWorld; varying vec3 vN;
      vec3 swing(vec3 p, float pivot, float ang){
        p.y -= pivot; float c = cos(ang), s = sin(ang);
        p = vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); p.y += pivot; return p;
      }
      void main(){
        vec3 p = position;
        float w = sin(uTime * 6.5 * aMove + aPhase) * ${stride.toFixed(2)} * step(0.01, aMove);
        if (part > 0.5 && part < 1.5) p = swing(p, ${hipY.toFixed(2)}, w);
        else if (part > 1.5 && part < 2.5) p = swing(p, ${hipY.toFixed(2)}, -w);
        else if (part > 2.5 && part < 3.5) p = swing(p, ${shoulderY.toFixed(2)}, -w*0.7*(1.0-aUmb));
        else if (part > 3.5 && part < 4.5) p = swing(p, ${shoulderY.toFixed(2)}, w*0.7*(1.0-aUmb));
        if (part > 5.5 && part < 7.5 && aUmb < 0.5) p *= 0.0;
        p.y += abs(sin(uTime * 6.5 * aMove + aPhase)) * 0.05 * step(0.01, aMove);
        vPart = part; vTint = aTint;
        vec4 wp = modelMatrix * instanceMatrix * vec4(p,1.0);
        vWorld = wp.xyz; vN = normalize(mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      varying float vPart; varying vec3 vTint; varying vec3 vWorld; varying vec3 vN;
      void main(){
        vec3 c = vec3(0.035,0.03,0.05) + vec3(0.1,0.05,0.16)*max(vN.y,0.0) + vTint*0.04*max(0.0, -vN.y+0.3);
        if (vPart > 4.5 && vPart < 5.5) c = vTint * 1.7;
        else if (vPart > 5.5 && vPart < 6.5) c = vTint * 0.35 + vec3(0.02);
        else if (vPart > 6.5 && vPart < 7.5) c = vTint * 2.0;
        else if (vPart > 7.5) c = mix(vTint, vec3(1.0), 0.4) * 2.2;
        c = mix(c, uFogColor, fogFactor(vWorld));
        gl_FragColor = vec4(c,1.0);
        ${OUTPUT}
      }`,
  });
}

class Walkers {
  constructor(rng, count, geo, mat, opts) {
    this.list = [];
    const lines = [];
    for (let k = -3; k <= 3; k++) {
      const c = k * 50 + 25;
      if (Math.abs(c) > BOUND) continue;
      for (const side of [-5.5, 5.5]) lines.push(c + side);
    }
    lines.push(-26, 26, -12, 12); // boulevards
    for (let i = 0; i < count; i++) {
      const idle = rng() < (opts.idle ?? 0.08);
      this.list.push({
        axis: rng() < 0.5 ? 0 : 1,
        c: pick(rng, lines) + (rng() - 0.5) * 1.6,
        dir: rng() < 0.5 ? -1 : 1,
        speed: idle ? 0 : opts.speed[0] + rng() * (opts.speed[1] - opts.speed[0]),
        off: rng() * 340,
        scale: opts.scale[0] + rng() * (opts.scale[1] - opts.scale[0]),
      });
    }
    const g = geo.clone();
    const n = count;
    const tint = new Float32Array(n * 3), phase = new Float32Array(n), umb = new Float32Array(n), move = new Float32Array(n);
    this.list.forEach((p, i) => {
      new THREE.Color(pick(rng, opts.colors || NEON)).toArray(tint, i * 3);
      phase[i] = rng() * 6.28;
      umb[i] = rng() < (opts.umbrellas ?? 0) ? 1 : 0;
      move[i] = p.speed > 0 ? p.speed / 1.4 : 0;
    });
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    g.setAttribute('aUmb', new THREE.InstancedBufferAttribute(umb, 1));
    g.setAttribute('aMove', new THREE.InstancedBufferAttribute(move, 1));
    this.mesh = new THREE.InstancedMesh(g, mat, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }
  update(t) {
    const { _m, _q, _p, _s, _up } = this;
    this.list.forEach((w, i) => {
      const s = ((w.off + t * w.speed * w.dir) % 340 + 340) % 340 - 170;
      if (w.axis === 0) _p.set(s, 0, w.c);
      else _p.set(w.c, 0, s);
      const yaw = w.axis === 0 ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : w.dir > 0 ? 0 : Math.PI;
      _q.setFromAxisAngle(_up, yaw);
      _s.setScalar(w.scale);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function buildCrowd(rng, tier) {
  const low = tier === 'low';
  const people = new Walkers(rng, low ? 140 : 280, humanGeometry(), walkerMaterial(0.86, 1.6, 0.5), {
    speed: [1.0, 1.9], scale: [0.92, 1.12], umbrellas: 0.45, idle: 0.08,
  });
  const robots = new Walkers(rng, low ? 14 : 26, robotGeometry(), walkerMaterial(1.1, 1.92, 0.35), {
    speed: [0.8, 1.3], scale: [1.0, 1.25], colors: ['#29e7ff', '#ffe14d', '#9dff3a', '#ff2d55'], idle: 0.2,
  });
  const dogs = new Walkers(rng, low ? 10 : 20, dogGeometry(), walkerMaterial(0.6, 0.9, 0.6), {
    speed: [2.0, 3.2], scale: [0.9, 1.1], colors: ['#ffe14d', '#29e7ff', '#ff2fb4'], idle: 0.0,
  });
  return [people, robots, dogs];
}

// ---------------------------------------------------------------------------
// Digital creatures: glowing jelly drones drifting between towers.
// ---------------------------------------------------------------------------
export class Jellies {
  constructor(rng, count) {
    const bell = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const parts = [part(bell, 0)];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      parts.push(part(new THREE.CylinderGeometry(0.04, 0.01, 3.2, 3, 6).translate(Math.cos(a) * 0.6, -1.6, Math.sin(a) * 0.6), 1));
    }
    const geo = mergeGeometries(parts);
    this.list = [];
    const tint = new Float32Array(count * 3), phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.list.push({ x: (rng() - 0.5) * 320, z: (rng() - 0.5) * 320, y: 7 + rng() * 26, r: 6 + rng() * 14, s: 0.7 + rng() * 1.4, sp: 0.05 + rng() * 0.1, ph: rng() * 6.28 });
      new THREE.Color(pick(rng, ['#a64dff', '#29e7ff', '#ff2fb4', '#9dff3a'])).toArray(tint, i * 3);
      phase[i] = rng() * 6.28;
    }
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    this.mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { ...U },
      vertexShader: /* glsl */ `
        uniform float uTime;
        attribute float part; attribute vec3 aTint; attribute float aPhase;
        varying vec3 vTint; varying float vPart; varying vec3 vWorld; varying float vRim; varying float vY;
        void main(){
          vec3 p = position;
          float pulse = sin(uTime*2.2 + aPhase);
          if (part < 0.5) { p.xz *= 1.0 + 0.12*pulse; p.y *= 1.0 - 0.15*pulse; }
          else { p.x += sin(p.y*1.6 + uTime*2.5 + aPhase)*0.25*(-p.y); p.z += cos(p.y*1.3 + uTime*2.0 + aPhase)*0.2*(-p.y); }
          vTint = aTint; vPart = part; vY = position.y;
          vec4 wp = modelMatrix * instanceMatrix * vec4(p,1.0);
          vWorld = wp.xyz;
          vec3 n = normalize(mat3(modelViewMatrix * instanceMatrix) * normal);
          vRim = 1.0 - abs(n.z);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        ${GLSL_COMMON}
        varying vec3 vTint; varying float vPart; varying vec3 vWorld; varying float vRim; varying float vY;
        void main(){
          float a = vPart < 0.5 ? (0.12 + pow(vRim, 2.0)*0.9 + step(0.92, fract(vY*5.0))*0.4) : 0.55 * (1.0 + vY/3.2);
          vec3 c = vTint * a * 1.3;
          c *= 1.0 - fogFactor(vWorld);
          gl_FragColor = vec4(c, 1.0);
          ${OUTPUT}
        }`,
    }), count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this._m = new THREE.Matrix4();
  }
  update(t) {
    const m = this._m;
    this.list.forEach((j, i) => {
      const a = t * j.sp + j.ph;
      const y = j.y + Math.sin(t * 0.6 + j.ph) * 2 + Math.max(0, Math.sin(t * 2.2 + j.ph)) * 0.6;
      m.makeScale(j.s, j.s, j.s);
      m.setPosition(j.x + Math.cos(a) * j.r, y, j.z + Math.sin(a) * j.r);
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Holographic sky whale + plaza koi, built from glowing points.
// ---------------------------------------------------------------------------
function fishPoints(rng, n, length) {
  const pos = [], u = [];
  for (let i = 0; i < n; i++) {
    const t = rng();
    const k = rng();
    let r = Math.sin(Math.PI * Math.pow(t, 0.65)) * length * 0.13;
    let x, y, z;
    if (k < 0.78) {
      const a = rng() * Math.PI * 2;
      const shell = 0.85 + rng() * 0.15;
      x = Math.cos(a) * r * shell;
      y = Math.sin(a) * r * 0.8 * shell;
      z = (t - 0.5) * length;
    } else if (k < 0.9) {
      // pectoral fins
      const side = rng() < 0.5 ? -1 : 1;
      const f = rng();
      x = side * (length * 0.12 + f * length * 0.22);
      y = -length * 0.04 - f * length * 0.05;
      z = length * (0.12 - f * 0.14) + (rng() - 0.5) * length * 0.06;
    } else {
      // tail flukes
      const side = rng() < 0.5 ? -1 : 1;
      const f = rng();
      x = side * f * length * 0.22;
      y = 0;
      z = -length * 0.5 - f * length * 0.12 + (rng() - 0.5) * length * 0.05;
    }
    pos.push(x, y, z);
    u.push(z / length + 0.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aU', new THREE.Float32BufferAttribute(u, 1));
  return g;
}

function holoPointsMaterial(color, size) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...U, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uPR: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uSize; uniform float uPR;
      attribute float aU; varying float vU; varying float vFlick;
      void main(){
        vec3 p = position;
        float wave = sin(aU*5.0 - uTime*1.6);
        p.y += wave * (1.0-aU) * (1.0-aU) * 4.0 * (uSize*0.4);
        p.x += sin(aU*3.0 - uTime*1.6) * (1.0-aU) * 1.5 * (uSize*0.4);
        vU = aU;
        vFlick = fract(sin(dot(position.xy, vec2(12.9898,78.233)) + floor(uTime*10.0)) * 43758.5453);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = uSize * uPR * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime;
      varying float vU; varying float vFlick;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(d));
        float scan = 0.6 + 0.4*sin(vU*80.0 - uTime*6.0);
        vec3 c = uColor * a * scan * (0.7 + 0.6*step(0.97, vFlick));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

export class HoloFauna {
  constructor(rng, tier) {
    this.group = new THREE.Group();
    const low = tier === 'low';
    this.whale = new THREE.Points(fishPoints(rng, low ? 2600 : 5000, 70), holoPointsMaterial('#29e7ff', 1.3));
    this.whale.frustumCulled = false;
    this.group.add(this.whale);
    this.koi = [];
    const koiGeo = fishPoints(rng, low ? 500 : 900, 7);
    ['#ff2fb4', '#ffe14d', '#a64dff'].forEach((c, i) => {
      const k = new THREE.Points(koiGeo, holoPointsMaterial(c, 0.45));
      k.userData = { r: 9 + i * 3.5, y: 9 + i * 2.2, sp: 0.35 + i * 0.08, ph: i * 2.1 };
      k.frustumCulled = false;
      this.koi.push(k);
      this.group.add(k);
    });
    this.materials = [this.whale.material, ...this.koi.map((k) => k.material)];
  }
  setPixelRatio(pr) {
    this.materials.forEach((m) => (m.uniforms.uPR.value = pr));
  }
  update(t) {
    const a = t * 0.035;
    const R = 120;
    this.whale.position.set(Math.cos(a) * R, 82 + Math.sin(t * 0.3) * 6, Math.sin(a) * R);
    this.whale.rotation.set(Math.sin(t * 0.3) * 0.08, -a, 0); // body points along +z; face direction of travel
    for (const k of this.koi) {
      const u = k.userData;
      const b = -t * u.sp + u.ph;
      k.position.set(Math.cos(b) * u.r, u.y + Math.sin(t + u.ph) * 0.8, Math.sin(b) * u.r);
      k.rotation.set(0, -b + Math.PI, 0);
    }
  }
}
