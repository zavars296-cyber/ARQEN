import * as THREE from 'three';
import { U, GLSL_COMMON, OUTPUT } from './common.js';
import { makeHorizontalSignAtlas, makeVerticalSignAtlas, makeAdAtlas, NEON } from './textures.js';
import { BOUND } from './city.js';

const insideAny = (colliders, x, z) =>
  colliders.some((c) => Math.abs(x - c.x) < c.hx && Math.abs(z - c.z) < c.hz);

// Signs read from an atlas: per instance we store which cell to show.
function signMaterial(atlas, cols, rows) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { ...U, uMap: { value: atlas }, uGrid: { value: new THREE.Vector2(cols, rows) } },
    vertexShader: /* glsl */ `
      attribute float aCell; attribute float aSeed;
      varying vec2 vUv; varying float vCell; varying float vSeed; varying vec3 vWorld;
      void main(){
        vUv = uv; vCell = aCell; vSeed = aSeed;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform sampler2D uMap; uniform vec2 uGrid;
      varying vec2 vUv; varying float vCell; varying float vSeed; varying vec3 vWorld;
      void main(){
        vec2 uv = vUv;
        if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
        float col = mod(vCell, uGrid.x), row = floor(vCell / uGrid.x);
        vec2 cuv = (vec2(col, uGrid.y - 1.0 - row) + uv) / uGrid;
        vec3 c = texture2D(uMap, cuv).rgb;
        // some signs flicker like failing tubes
        float bad = step(0.82, hash11(vSeed));
        float t = floor(uTime * 14.0 + vSeed * 31.0);
        float fl = mix(1.0, step(0.35, hash11(t)) * 0.9 + 0.1, bad);
        fl *= 0.92 + 0.08 * sin(uTime * 3.0 + vSeed * 10.0);
        c *= 1.35 * fl;
        c *= 1.0 - fogFactor(vWorld);
        gl_FragColor = vec4(c, 1.0);
        ${OUTPUT}
      }`,
  });
}

function screenMaterial(atlas) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U, uMap: { value: atlas } },
    vertexShader: /* glsl */ `
      attribute float aCell; attribute float aSeed; attribute float aAspect; attribute float aMode;
      attribute vec3 aColA; attribute vec3 aColB;
      varying vec2 vUv; varying float vCell; varying float vSeed; varying float vAspect; varying float vMode;
      varying vec3 vColA; varying vec3 vColB; varying vec3 vWorld;
      void main(){
        vUv = uv; vCell = aCell; vSeed = aSeed; vAspect = aAspect; vMode = aMode; vColA = aColA; vColB = aColB;
        vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform sampler2D uMap;
      varying vec2 vUv; varying float vCell; varying float vSeed; varying float vAspect; varying float vMode;
      varying vec3 vColA; varying vec3 vColB; varying vec3 vWorld;
      vec3 ad(vec2 suv, float cell){
        float col = mod(cell, 4.0), row = floor(cell / 4.0);
        return texture2D(uMap, (vec2(col, 3.0 - row) + clamp(suv,0.002,0.998)) / 4.0).rgb;
      }
      void main(){
        vec2 uv = vUv;
        if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
        vec3 c;
        float slot = floor((uTime + vSeed * 13.0) / 7.0);
        float glitch = step(0.93, hash11(floor(uTime * 9.0) + vSeed * 7.0));
        if (vMode < 0.5) {
          vec2 suv = uv;
          if (vAspect > 1.0) suv.y = (uv.y - 0.5) / vAspect + 0.5; else suv.x = (uv.x - 0.5) * vAspect + 0.5;
          float cell = mod(vCell + slot * 5.0, 16.0);
          float shift = glitch * (hash11(floor(uv.y * 24.0) + uTime) - 0.5) * 0.12;
          suv.x += shift;
          c.r = ad(suv + vec2(glitch*0.012,0.0), cell).r;
          c.g = ad(suv, cell).g;
          c.b = ad(suv - vec2(glitch*0.012,0.0), cell).b;
          // transition wipe between slots
          float ph = fract((uTime + vSeed * 13.0) / 7.0);
          c *= smoothstep(0.0, 0.04, ph) * smoothstep(1.0, 0.97, ph);
        } else if (vMode < 1.5) {
          // equaliser bars
          float bars = 18.0;
          float id = floor(uv.x * bars);
          float hgt = 0.25 + 0.7 * abs(sin(uTime * (1.5 + hash11(id+vSeed)*3.0) + id));
          float on = step(uv.y, hgt) * step(0.15, fract(uv.x * bars)) * step(0.3, fract(uv.y * 30.0));
          c = mix(vColA, vColB, uv.y) * on * 1.2;
        } else {
          // radial pulses + rotating segments
          vec2 p = (uv - 0.5) * vec2(vAspect, 1.0);
          float r = length(p);
          float a = atan(p.y, p.x);
          float rings = smoothstep(0.1, 0.0, abs(fract(r * 6.0 - uTime * 0.8) - 0.5) - 0.35);
          float seg = step(0.5, fract(a / 6.2831 * 8.0 + uTime * 0.2));
          c = mix(vColA, vColB, seg) * rings * smoothstep(0.55, 0.1, r) * 1.3;
        }
        c *= 0.82 + 0.18 * sin(uv.y * 380.0);          // scanlines
        c += glitch * vColA * 0.15;
        float border = max(step(abs(uv.x - 0.5), 0.5) - step(abs(uv.x - 0.5), 0.485), step(abs(uv.y - 0.5), 0.5) - step(abs(uv.y - 0.5), 0.47));
        c += border * vColA * 1.5;
        c *= 1.25;
        c = mix(c, uFogColor, fogFactor(vWorld));
        gl_FragColor = vec4(c, 1.0);
        ${OUTPUT}
      }`,
  });
}

// Places signs and screens on the facades that face walkable streets.
export function buildNeon(rng, layout, tier) {
  const group = new THREE.Group();
  const lights = [];
  const hAtlas = makeHorizontalSignAtlas(rng);
  const vAtlas = makeVerticalSignAtlas(rng);
  const adAtlas = makeAdAtlas(rng);

  const hSigns = [], vSigns = [], screens = [];
  const faces = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  for (const f of layout.facades) {
    for (const [nx, nz] of faces) {
      const halfAlong = nx ? f.hz : f.hx;
      const off = nx ? f.hx : f.hz;
      const fx = f.x + nx * off, fz = f.z + nz * off;
      if (insideAny(layout.colliders, fx + nx * 4, fz + nz * 4)) continue; // faces another lot
      if (Math.abs(fx + nx * 4) > BOUND || Math.abs(fz + nz * 4) > BOUND) continue;
      const tx = -nz, tz = nx; // along the face
      const yaw = Math.atan2(nx, nz);

      if (rng() < 0.75) {
        const w = 7 + rng() * 7;
        const h = w / 4;
        const along = (rng() - 0.5) * (halfAlong * 2 - w - 1);
        const y = 4.5 + rng() * Math.min(12, f.h - 6);
        const cell = Math.floor(rng() * hAtlas.count);
        hSigns.push({ x: fx + nx * 0.4 + tx * along, y, z: fz + nz * 0.4 + tz * along, yaw, w, h, cell, seed: rng() });
        lights.push({ x: fx + nx * 6 + tx * along, z: fz + nz * 6 + tz * along, r: 16, color: hAtlas.colors[cell], i: 0.9 });
      }
      const blades = rng() < 0.7 ? 1 + Math.floor(rng() * 2) : 0;
      for (let b = 0; b < blades; b++) {
        const h = 8 + rng() * 6;
        const w = h / 4;
        const along = (b ? -1 : 1) * (halfAlong - 1.5) * (0.4 + rng() * 0.55);
        const y = 6 + h / 2 + rng() * Math.min(16, f.h);
        const cell = Math.floor(rng() * vAtlas.count);
        vSigns.push({ x: fx + nx * (w / 2 + 0.3) + tx * along, y, z: fz + nz * (w / 2 + 0.3) + tz * along, yaw: yaw + Math.PI / 2, w, h, cell, seed: rng() });
        lights.push({ x: fx + nx * 5 + tx * along, z: fz + nz * 5 + tz * along, r: 14, color: vAtlas.colors[cell], i: 0.8 });
      }
      if (f.h > 34 && rng() < 0.45) {
        const w = 10 + rng() * 10;
        const h = w * (0.55 + rng() * 0.5);
        const y = 22 + rng() * Math.max(2, f.h - 26 - h / 2);
        screens.push(makeScreen(rng, fx + nx * 0.35, y, fz + nz * 0.35, yaw, w, h, adAtlas));
        lights.push({ x: fx + nx * 10, z: fz + nz * 10, r: 28, color: NEON[Math.floor(rng() * NEON.length)], i: 0.5 });
      }
    }
  }

  // Giant screens on tall outer towers, turned toward the city centre.
  const tall = layout.pieces.filter((p) => p.type === 'box' && !p.rot && p.sy > 100 && Math.hypot(p.x, p.z) > 170 && Math.hypot(p.x, p.z) < 330);
  for (const p of tall) {
    if (rng() > (tier === 'low' ? 0.35 : 0.6)) continue;
    const toC = [-p.x, -p.z];
    const useX = Math.abs(toC[0]) > Math.abs(toC[1]);
    const nx = useX ? Math.sign(toC[0]) : 0, nz = useX ? 0 : Math.sign(toC[1]);
    const half = useX ? p.sx / 2 : p.sz / 2;
    const faceW = useX ? p.sz : p.sx;
    const w = faceW * 0.85;
    const h = Math.min(p.sy * 0.45, w * (0.9 + rng() * 0.8));
    const y = p.y + p.sy * (0.05 + rng() * 0.2) - h * 0.1;
    screens.push(makeScreen(rng, p.x + nx * (half + 0.4), y, p.z + nz * (half + 0.4), Math.atan2(nx, nz), w, h, adAtlas, 0));
  }

  const plane = new THREE.PlaneGeometry(1, 1);
  group.add(instancedSigns(plane, hSigns, signMaterial(hAtlas.texture, hAtlas.cols, hAtlas.rows)));
  group.add(instancedSigns(plane, vSigns, signMaterial(vAtlas.texture, vAtlas.cols, vAtlas.rows)));
  group.add(instancedScreens(plane, screens, screenMaterial(adAtlas.texture)));

  return { group, lights, adAtlas, hAtlas, vAtlas };
}

function makeScreen(rng, x, y, z, yaw, w, h, adAtlas, forceMode) {
  const mode = forceMode ?? (rng() < 0.72 ? 0 : rng() < 0.5 ? 1 : 2);
  const a = NEON[Math.floor(rng() * NEON.length)];
  let b = NEON[Math.floor(rng() * NEON.length)];
  if (b === a) b = '#eaf6ff';
  return { x, y, z, yaw, w, h, mode, cell: Math.floor(rng() * adAtlas.count), seed: rng() * 10, a: new THREE.Color(a), b: new THREE.Color(b) };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function setTRS(mesh, i, s) {
  _q.setFromEuler(_e.set(0, s.yaw, 0));
  _m.compose(new THREE.Vector3(s.x, s.y, s.z), _q, new THREE.Vector3(s.w, s.h, 1));
  mesh.setMatrixAt(i, _m);
}

function instancedSigns(plane, list, mat) {
  const geo = plane.clone();
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  mesh.count = list.length;
  const cell = new Float32Array(list.length), seed = new Float32Array(list.length);
  list.forEach((s, i) => {
    setTRS(mesh, i, s);
    cell[i] = s.cell;
    seed[i] = s.seed;
  });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 1));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return mesh;
}

function instancedScreens(plane, list, mat) {
  const geo = plane.clone();
  const n = list.length;
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  mesh.count = n;
  const cell = new Float32Array(n), seed = new Float32Array(n), aspect = new Float32Array(n), mode = new Float32Array(n);
  const ca = new Float32Array(n * 3), cb = new Float32Array(n * 3);
  list.forEach((s, i) => {
    setTRS(mesh, i, s);
    cell[i] = s.cell;
    seed[i] = s.seed;
    aspect[i] = s.w / s.h;
    mode[i] = s.mode;
    s.a.toArray(ca, i * 3);
    s.b.toArray(cb, i * 3);
  });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 1));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
  geo.setAttribute('aAspect', new THREE.InstancedBufferAttribute(aspect, 1));
  geo.setAttribute('aMode', new THREE.InstancedBufferAttribute(mode, 1));
  geo.setAttribute('aColA', new THREE.InstancedBufferAttribute(ca, 3));
  geo.setAttribute('aColB', new THREE.InstancedBufferAttribute(cb, 3));
  mesh.frustumCulled = false;
  return mesh;
}

// Street lamps along the boulevards and the plaza: one instanced post mesh
// plus one instanced glowing head.
export function buildLamps(lights) {
  const pts = [];
  for (let s = -160; s <= 160; s += 20) {
    if (Math.abs(s) < 44) continue;
    for (const side of [-1, 1]) {
      pts.push([side * 30, s, s % 40 ? '#29e7ff' : '#ff2fb4']);
      pts.push([s, side * 30, s % 40 ? '#a64dff' : '#29e7ff']);
    }
  }
  const postGeo = new THREE.CylinderGeometry(0.12, 0.18, 7, 6);
  postGeo.translate(0, 3.5, 0);
  const posts = new THREE.InstancedMesh(postGeo, new THREE.MeshBasicMaterial({ color: '#0b0a14' }), pts.length);
  const headGeo = new THREE.BoxGeometry(0.35, 2.4, 0.35);
  headGeo.translate(0, 7.8, 0);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), pts.length);
  const m = new THREE.Matrix4();
  pts.forEach(([x, z, c], i) => {
    m.makeTranslation(x, 0, z);
    posts.setMatrixAt(i, m);
    heads.setMatrixAt(i, m);
    heads.setColorAt(i, new THREE.Color(c).multiplyScalar(2.2));
    lights.push({ x, z, r: 11, color: c, i: 0.8 });
  });
  const g = new THREE.Group();
  g.add(posts, heads);
  return g;
}
