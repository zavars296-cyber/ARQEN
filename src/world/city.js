import * as THREE from 'three';
import { U, GLSL_COMMON, OUTPUT } from './common.js';

// ---------------------------------------------------------------------------
// City layout
// Blocks sit on a 50-unit grid. The row and column through the centre are open
// boulevards that lead from the central plaza to the four main districts.
// ---------------------------------------------------------------------------
export const PITCH = 50;
export const HALF = 18; // half size of a city block
export const BOUND = 176; // walkable square half size

export const ZONE_LAYOUT = {
  about: { block: [0, -3], dir: [0, 1] },
  services: { block: [3, 0], dir: [-1, 0] },
  works: { block: [-3, 0], dir: [1, 0] },
  process: { block: [0, 3], dir: [0, -1] },
  contact: { block: [1, 1], dir: [-Math.SQRT1_2, -Math.SQRT1_2] },
};
for (const z of Object.values(ZONE_LAYOUT)) {
  z.x = z.block[0] * PITCH;
  z.z = z.block[1] * PITCH;
  const diag = Math.abs(z.dir[0]) > 0.1 && Math.abs(z.dir[1]) > 0.1;
  const dist = diag ? 34 : 28;
  z.tx = z.x + z.dir[0] * dist; // trigger point in front of the landmark
  z.tz = z.z + z.dir[1] * dist;
}

const isZoneBlock = (i, j) =>
  Object.values(ZONE_LAYOUT).some((z) => z.block[0] === i && z.block[1] === j);

export function district(x, z) {
  if (Math.abs(x) < 40 && Math.abs(z) < 40) return 'plaza';
  if (Math.abs(z) > Math.abs(x)) return z < 0 ? 'north' : 'south';
  return x > 0 ? 'east' : 'west';
}

const STYLE = {
  north: { tints: ['#9fd8ff', '#6fb7ff', '#d6ecff', '#7fe9ff'], edges: ['#29e7ff', '#3d6bff', '#eaf6ff'] },
  east: { tints: ['#ffb36b', '#ff7ac8', '#ffe14d', '#ff9a7a'], edges: ['#ff2fb4', '#ffe14d', '#ff2d55', '#9dff3a'] },
  west: { tints: ['#c9a6ff', '#ff9be0', '#9fb4ff'], edges: ['#a64dff', '#ff2fb4', '#29e7ff'] },
  south: { tints: ['#c8ff9e', '#9ff5ff', '#ffd27a'], edges: ['#9dff3a', '#29e7ff', '#ffe14d'] },
  plaza: { tints: ['#ff9bb0', '#ffb3e6'], edges: ['#ff2d55', '#ff2fb4'] },
};

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function generateLayout(rng, gridR) {
  const pieces = []; // building volumes
  const colliders = []; // axis-aligned rects the player can't enter
  const facades = []; // ground-floor volumes facing walkable streets (for signs)
  const roofs = []; // roof tops for antennas / beacons

  const add = (p) => {
    pieces.push(p);
    return p;
  };

  for (let i = -gridR; i <= gridR; i++) {
    for (let j = -gridR; j <= gridR; j++) {
      const bx = i * PITCH, bz = j * PITCH;
      const inner = Math.max(Math.abs(i), Math.abs(j)) <= 3;
      if (inner && (i === 0 || j === 0) && !isZoneBlock(i, j)) continue; // boulevards
      if (inner) colliders.push({ x: bx, z: bz, hx: HALF + 0.8, hz: HALF + 0.8 });
      if (isZoneBlock(i, j)) continue; // landmarks are built in zones.js

      const d = district(bx, bz);
      const st = STYLE[d];
      const ring = Math.max(Math.abs(i), Math.abs(j));
      const lots = [];
      const r = rng();
      if (r < 0.3) lots.push([bx, bz, 34, 34]);
      else if (r < 0.65) {
        if (rng() < 0.5) lots.push([bx - 8.75, bz, 16.5, 34], [bx + 8.75, bz, 16.5, 34]);
        else lots.push([bx, bz - 8.75, 34, 16.5], [bx, bz + 8.75, 34, 16.5]);
      } else {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) lots.push([bx + sx * 8.75, bz + sz * 8.75, 16.5, 16.5]);
      }

      for (const [lx, lz, lw, ld] of lots) {
        const tint = new THREE.Color(pick(rng, st.tints));
        const edge = rng() < (inner ? 0.55 : 0.35) ? new THREE.Color(pick(rng, st.edges)) : new THREE.Color(0, 0, 0);
        const seed = rng() * 100;
        let h;
        if (inner) h = 16 + rng() * 44 + (ring === 3 ? 30 : 0);
        else h = 50 + rng() * 110 + (ring - 3) * 12;
        if (!inner && rng() < 0.12) h = 210 + rng() * 110; // megatowers
        if (d === 'east') h *= 0.8;
        if (d === 'north') h *= 1.15;

        const w = lw * (0.82 + rng() * 0.14), dd = ld * (0.82 + rng() * 0.14);
        const base = { type: 'box', x: lx, z: lz, sx: w, sy: h, sz: dd, y: h / 2, rot: 0, tint, edge, seed };

        if (d === 'north') {
          if (rng() < 0.3 && !inner) {
            add({ ...base, type: 'cyl', sx: Math.min(w, dd), sz: Math.min(w, dd) });
          } else add(base);
          if (rng() < 0.55) {
            const h2 = h * (0.25 + rng() * 0.45);
            const top = rng() < 0.4 ? 'cyl' : 'box';
            const s = Math.min(w, dd) * 0.62;
            add({ ...base, type: top, sx: top === 'cyl' ? s : w * 0.62, sz: top === 'cyl' ? s : dd * 0.62, sy: h2, y: h + h2 / 2, seed: seed + 1 });
            roofs.push({ x: lx, z: lz, y: h + h2, s, tall: h + h2 > 120 });
          } else roofs.push({ x: lx, z: lz, y: h, s: Math.min(w, dd), tall: h > 120 });
        } else if (d === 'east' || d === 'plaza') {
          add(base);
          let y = h;
          const tiers = 1 + Math.floor(rng() * 2);
          let s = 1;
          for (let k = 0; k < tiers; k++) {
            s *= 0.6 + rng() * 0.25;
            const h2 = h * (0.2 + rng() * 0.35);
            add({ ...base, sx: w * s, sz: dd * s, sy: h2, y: y + h2 / 2, x: lx + (rng() - 0.5) * w * (1 - s), z: lz + (rng() - 0.5) * dd * (1 - s), seed: seed + k + 1 });
            y += h2;
          }
          roofs.push({ x: lx, z: lz, y, s: Math.min(w, dd) * s, tall: y > 120 });
        } else if (d === 'west') {
          if (rng() < 0.35) {
            // rotated monolith
            const s = Math.min(w, dd) * 0.72;
            add({ ...base, sx: s, sz: s, rot: Math.PI / 4, sy: h * 1.1, y: (h * 1.1) / 2 });
            roofs.push({ x: lx, z: lz, y: h * 1.1, s: s * 0.7, tall: h > 110 });
          } else {
            let y = 0, s = 1;
            const tiers = 3;
            for (let k = 0; k < tiers; k++) {
              const h2 = (h / tiers) * (k === tiers - 1 ? 1.4 : 1);
              add({ ...base, sx: w * s, sz: dd * s, sy: h2, y: y + h2 / 2, seed: seed + k });
              y += h2;
              s *= 0.72;
            }
            roofs.push({ x: lx, z: lz, y, s: Math.min(w, dd) * s, tall: y > 120 });
          }
        } else {
          // south: industrial / tech
          const hb = h * 0.55;
          add({ ...base, sy: hb, y: hb / 2 });
          const n = 1 + Math.floor(rng() * 2);
          for (let k = 0; k < n; k++) {
            const s = Math.min(w, dd) * (0.3 + rng() * 0.15);
            const ch = h * (0.6 + rng() * 0.7);
            const ox = (k - (n - 1) / 2) * s * 1.2;
            add({ ...base, type: 'cyl', sx: s, sz: s, sy: ch, y: hb + ch / 2, x: lx + ox, seed: seed + 2 + k });
            roofs.push({ x: lx + ox, z: lz, y: hb + ch, s, tall: hb + ch > 110 });
          }
        }

        if (inner) facades.push({ x: lx, z: lz, hx: w / 2, hz: dd / 2, h: Math.min(h, 60), d, seed });
      }
    }
  }

  // Distant megastructures on the horizon.
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2 + rng() * 0.1;
    const rad = 360 + rng() * 80;
    const h = 220 + rng() * 260;
    const s = 30 + rng() * 40;
    pieces.push({
      type: rng() < 0.3 ? 'cyl' : 'box',
      x: Math.cos(a) * rad, z: Math.sin(a) * rad, sx: s, sz: s * (0.7 + rng() * 0.6), sy: h, y: h / 2, rot: a,
      tint: new THREE.Color(pick(rng, ['#ff7ac8', '#7fe9ff', '#c9a6ff'])),
      edge: new THREE.Color(pick(rng, ['#ff2fb4', '#29e7ff', '#a64dff'])), seed: rng() * 100,
    });
  }

  return { pieces, colliders, facades, roofs };
}

// ---------------------------------------------------------------------------
// Building material: windows, neon edges and bands are computed in the shader
// from world coordinates, so one draw call covers hundreds of towers.
// ---------------------------------------------------------------------------
function buildingMaterial(isBox) {
  return new THREE.ShaderMaterial({
    defines: isBox ? { BOX: 1 } : {},
    uniforms: { ...U },
    vertexShader: /* glsl */ `
      attribute vec3 aTint; attribute vec3 aEdge; attribute float aSeed;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying vec3 vScale;
      varying vec3 vTint; varying vec3 vEdge; varying float vSeed;
      void main(){
        vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        mat3 im = mat3(instanceMatrix);
        vScale = vec3(length(im[0]), length(im[1]), length(im[2]));
        vN = normalize(im * (normal / (vScale*vScale)));
        vLocal = position; vTint = aTint; vEdge = aEdge; vSeed = aSeed;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal; varying vec3 vScale;
      varying vec3 vTint; varying vec3 vEdge; varying float vSeed;
      void main(){
        vec3 n = normalize(vN);
        float up = n.y;
        vec3 col = vec3(0.016,0.018,0.034);
        col += vec3(0.16,0.04,0.16) * exp(-vWorld.y/10.0) * 0.5;      // street glow on lower floors
        col += vec3(0.05,0.03,0.12) * smoothstep(-0.2,1.0,n.x*0.6+n.z*0.3); // sky bounce
        if (up < 0.5) {
          vec2 t = normalize(vec2(-n.z, n.x) + 1e-5);
          float h = dot(vWorld.xz, t);
          vec2 cell = vec2(h/2.4, vWorld.y/3.2);
          vec2 id = floor(cell); vec2 f = fract(cell);
          float win = step(0.16,f.x)*step(f.x,0.84)*step(0.22,f.y)*step(f.y,0.80);
          float r = hash21(id + vSeed*17.0);
          float density = 0.2 + 0.5*hash11(vSeed*3.1);
          float lit = step(1.0-density, r);
          lit = max(lit, step(0.94, hash21(vec2(id.y, vSeed*9.0))));
          vec3 wc = vTint * (0.3 + 0.9*hash21(id*1.7+vSeed));
          wc = mix(wc, vec3(1.0,0.75,0.45), step(0.93, hash21(id+3.3)));
          float flick = 1.0 - step(0.996, hash21(id + floor(uTime*6.0)))*0.85;
          col += win * lit * wc * 0.85 * flick;
          col += win * (1.0-lit) * vTint * 0.025;
          float bandOn = step(0.55, hash11(vSeed*5.7));
          float period = 14.0 + 22.0*hash11(vSeed);
          float bandY = abs(fract(vWorld.y/period) - 0.5);
          col += bandOn * smoothstep(0.035, 0.0, bandY) * vEdge * 1.6;
        } else {
          col = vec3(0.014,0.012,0.024);
        }
        #ifdef BOX
          vec3 dE = (0.5 - abs(vLocal)) * vScale;
          float de = max(dE.x, dE.z);
          float edge = smoothstep(0.32, 0.0, de) + smoothstep(0.35,0.0,dE.y)*step(up,0.5)*step(0.0,vLocal.y);
          col += edge * vEdge * 2.2;
        #endif
        col = mix(col, uFogColor, fogFactor(vWorld));
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT}
      }`,
  });
}

export function buildBuildings(pieces) {
  const group = new THREE.Group();
  const kinds = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1),
  };
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (const kind of ['box', 'cyl']) {
    const list = pieces.filter((p) => p.type === kind);
    const geo = kinds[kind].clone();
    const tint = new Float32Array(list.length * 3);
    const edge = new Float32Array(list.length * 3);
    const seed = new Float32Array(list.length);
    const mesh = new THREE.InstancedMesh(geo, buildingMaterial(kind === 'box'), list.length);
    list.forEach((p, i) => {
      q.setFromAxisAngle(yAxis, p.rot || 0);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.sx, p.sy, p.sz));
      mesh.setMatrixAt(i, m);
      p.tint.toArray(tint, i * 3);
      p.edge.toArray(edge, i * 3);
      seed[i] = p.seed;
    });
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
    geo.setAttribute('aEdge', new THREE.InstancedBufferAttribute(edge, 3));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    mesh.frustumCulled = false;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

// ---------------------------------------------------------------------------
// Wet street: markings, plaza grid, and a baked neon light map that is
// smeared toward the camera to fake reflections in puddles.
// ---------------------------------------------------------------------------
export const LIGHTMAP_EXTENT = 360;

export function buildGround() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uLight: { value: null } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform sampler2D uLight;
      varying vec3 vWorld;
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
      vec3 lightAt(vec2 p){ return texture2D(uLight, p/${(LIGHTMAP_EXTENT * 2).toFixed(1)} + 0.5).rgb; }
      void main(){
        vec2 p = vWorld.xz;
        vec3 col = vec3(0.022,0.022,0.038);
        float puddle = smoothstep(0.52, 0.7, noise(p*0.09) * 0.7 + noise(p*0.37)*0.3);
        // tiles
        vec2 tile = abs(fract(p/3.0)-0.5);
        col += 0.006 * step(0.47, max(tile.x,tile.y));
        // street markings
        float fx = mod(p.x - 25.0, 50.0) - 25.0;
        float fz = mod(p.y - 25.0, 50.0) - 25.0;
        float dash = step(0.5, fract(p.x/6.0));
        float dashz = step(0.5, fract(p.y/6.0));
        vec3 mark = vec3(0.0);
        mark += vec3(0.1,0.7,0.9) * smoothstep(0.18,0.05,abs(fz)) * dash * step(7.0, abs(fx));
        mark += vec3(0.1,0.7,0.9) * smoothstep(0.18,0.05,abs(fx)) * dashz * step(7.0, abs(fz));
        float curb = smoothstep(0.15,0.0,abs(abs(fz)-7.0)) + smoothstep(0.15,0.0,abs(abs(fx)-7.0));
        mark += vec3(0.6,0.15,0.5) * curb * 0.5;
        float cross = step(abs(fx),6.0)*step(7.5,abs(fz))*step(abs(fz),11.0)*step(0.5,fract(p.x/1.4));
        cross += step(abs(fz),6.0)*step(7.5,abs(fx))*step(abs(fx),11.0)*step(0.5,fract(p.y/1.4));
        mark += vec3(0.5) * cross * 0.25;
        col += mark * (1.0 - puddle*0.6);
        // plaza: hex rings around the centre
        float r = length(p);
        float plaza = smoothstep(42.0, 38.0, r);
        float rings = smoothstep(0.25,0.0,abs(fract(r/6.0 - uTime*0.08)-0.5)*6.0-2.6);
        col += plaza * vec3(1.0,0.12,0.45) * rings * 0.35;
        float spokes = smoothstep(0.06,0.0,abs(fract(atan(p.y,p.x)/6.2831*12.0)-0.5)*r*0.08);
        col += plaza * vec3(0.2,0.6,1.0) * spokes * 0.25 * step(8.0,r);
        // neon light pools + reflection smear toward the camera
        vec2 toCam = normalize(cameraPosition.xz - p + 1e-4);
        vec3 refl = lightAt(p) * 0.55;
        refl += lightAt(p - toCam*3.0) * 0.45;
        refl += lightAt(p - toCam*7.0) * 0.35;
        refl += lightAt(p - toCam*12.0) * 0.25;
        float wet = 0.45 + puddle * 1.6;
        col += refl * wet;
        col += vec3(0.05,0.02,0.09) * puddle; // sky in puddles
        col = mix(col, uFogColor, fogFactor(vWorld));
        gl_FragColor = vec4(col,1.0);
        ${OUTPUT}
      }`,
  });
  const geo = new THREE.PlaneGeometry(LIGHTMAP_EXTENT * 2, LIGHTMAP_EXTENT * 2, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

// Paints coloured glows for every light source on a top-down canvas.
export function bakeLightMap(lights) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';
  const toPx = (v) => ((v + LIGHTMAP_EXTENT) / (LIGHTMAP_EXTENT * 2)) * size;
  for (const L of lights) {
    const x = toPx(L.x), y = toPx(L.z);
    const rad = (L.r / (LIGHTMAP_EXTENT * 2)) * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const col = new THREE.Color(L.color);
    const s = L.i ?? 1;
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
    g.addColorStop(0, `rgba(${rgb},${0.55 * s})`);
    g.addColorStop(0.4, `rgba(${rgb},${0.18 * s})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Sky dome with light-polluted clouds.
// ---------------------------------------------------------------------------
export function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...U },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      varying vec3 vDir;
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      void main(){
        float y = vDir.y;
        vec3 horizon = vec3(0.32,0.08,0.34);
        vec3 zenith = vec3(0.01,0.008,0.03);
        vec3 col = mix(horizon, zenith, smoothstep(-0.05, 0.55, y));
        col = mix(col, uFogColor, smoothstep(0.12, -0.02, y));
        vec2 uv = vDir.xz / max(y, 0.05);
        float c = fbm(uv*0.6 + vec2(uTime*0.01, uTime*0.004));
        float cl = smoothstep(0.45, 0.85, c) * smoothstep(0.0, 0.25, y);
        vec3 cloudCol = mix(vec3(0.5,0.1,0.45), vec3(0.12,0.2,0.55), smoothstep(0.1,0.6,y));
        col += cloudCol * cl * 0.5;
        // a few stars where clouds are thin
        float st = step(0.9985, hash21(floor(vDir.xz*420.0 + vDir.y*99.0))) * smoothstep(0.3,0.7,y) * (1.0-cl);
        col += st * 0.6;
        gl_FragColor = vec4(col,1.0);
        ${OUTPUT}
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}
