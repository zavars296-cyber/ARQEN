import * as THREE from 'three';
import { U, GLSL_COMMON, OUTPUT } from './common.js';
import { ZONE_LAYOUT } from './city.js';
import { makeZoneSign } from './textures.js';
import { ZONES, PROJECTS } from '../content.js';

// ---------------------------------------------------------------------------
// ARQEN emblem: hex frame + chevron "A" + floating core, extruded in metal.
// ---------------------------------------------------------------------------
export function emblemShapes() {
  const hex = (r) => {
    const s = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 3;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    s.closePath();
    return s;
  };
  const frame = hex(1);
  const hole = hex(0.86);
  frame.holes.push(new THREE.Path(hole.getPoints().reverse()));
  const chev = new THREE.Shape();
  chev.moveTo(-0.58, -0.5);
  chev.lineTo(0, 0.58);
  chev.lineTo(0.58, -0.5);
  chev.lineTo(0.38, -0.5);
  chev.lineTo(0, 0.2);
  chev.lineTo(-0.38, -0.5);
  chev.closePath();
  return { frame, chev };
}

export function makeEnvMap(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#05030a');
  const panel = (color, x, y, z, w, h, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    env.add(m);
  };
  panel(new THREE.Color('#ff2fb4').multiplyScalar(3), -6, 2, 0, 3, 8, Math.PI / 2);
  panel(new THREE.Color('#29e7ff').multiplyScalar(3), 6, 1, 0, 3, 8, -Math.PI / 2);
  panel(new THREE.Color('#a64dff').multiplyScalar(2), 0, 3, -6, 8, 3);
  panel(new THREE.Color('#ffffff').multiplyScalar(1.5), 0, 6, 0, 10, 10);
  env.children[3].rotation.x = Math.PI / 2;
  panel(new THREE.Color('#ffe14d').multiplyScalar(1.2), 0, -1, 6, 4, 1.5);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.03);
  pm.dispose();
  return rt.texture;
}

export function buildEmblem(envMap, opts = {}) {
  const { frame, chev } = emblemShapes();
  const metal = new THREE.MeshStandardMaterial({ color: '#e4e7f2', metalness: 1, roughness: 0.18, envMap, envMapIntensity: 2.2 });
  const dark = new THREE.MeshStandardMaterial({ color: '#8a8299', metalness: 1, roughness: 0.25, envMap, envMapIntensity: 1.8 });
  const g = new THREE.Group();
  const fg = new THREE.ExtrudeGeometry(frame, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2, curveSegments: 2 });
  fg.translate(0, 0, -0.08);
  const cg = new THREE.ExtrudeGeometry(chev, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 });
  cg.translate(0, 0, -0.15);
  const fm = new THREE.Mesh(fg, dark);
  const cm = new THREE.Mesh(cg, metal);
  g.add(fm, cm);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: new THREE.Color('#29e7ff').multiplyScalar(3), toneMapped: false }));
  core.position.set(0, -0.2, 0);
  g.add(core);
  const edgeMat = (c) => new THREE.LineBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.5), toneMapped: false });
  const fe = new THREE.LineSegments(new THREE.EdgesGeometry(fg, 30), edgeMat(opts.frameColor || '#ff2fb4'));
  const ce = new THREE.LineSegments(new THREE.EdgesGeometry(cg, 30), edgeMat(opts.chevColor || '#29e7ff'));
  g.add(fe, ce);
  g.userData.core = core;
  return g;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function beamMaterial(color, strength = 1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { ...U, uColor: { value: new THREE.Color(color) }, uStr: { value: strength } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
      void main(){ vUv = uv; vec4 wp = modelMatrix*vec4(position,1.0); vWorld = wp.xyz;
        vN = normalize(mat3(modelMatrix)*normal); vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: /* glsl */ `${GLSL_COMMON}
      uniform vec3 uColor; uniform float uStr;
      varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vView;
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), vView)), 1.5);
        float a = (1.0 - vUv.y) * (0.25 + 0.75*fres);
        a *= 0.75 + 0.25*sin(vUv.y*60.0 - uTime*4.0);
        vec3 c = uColor * a * uStr;
        c *= 1.0 - fogFactor(vWorld)*0.7;
        gl_FragColor = vec4(c,1.0);
        ${OUTPUT}
      }`,
  });
}

function glowLineMat(color, k = 2.2) {
  return new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
}
function glowMat(color, k = 2, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false, transparent: opacity < 1, opacity, blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: opacity >= 1, side: THREE.DoubleSide });
}
const darkMetal = (envMap) => new THREE.MeshStandardMaterial({ color: '#16141f', metalness: 0.9, roughness: 0.35, envMap, envMapIntensity: 0.9 });

// ---------------------------------------------------------------------------
// The five destinations
// ---------------------------------------------------------------------------
export function buildZones(envMap, adAtlas, tier) {
  const zones = [];
  const extraPieces = [];
  const lights = [];
  const animated = [];

  for (const z of ZONES) {
    const L = ZONE_LAYOUT[z.id];
    const g = new THREE.Group();
    const yaw = Math.atan2(L.dir[0], L.dir[1]);
    const root = new THREE.Group();
    root.position.set(L.x, 0, L.z);
    root.rotation.y = yaw; // local +z faces the street / plaza
    g.add(root);

    // Zone sign (the interactive object)
    const signTex = makeZoneSign(z);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 6),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })
    );
    sign.renderOrder = 4;

    const tint = (c) => new THREE.Color(c);
    const piece = (lx, lz, sx, sy, sz, type = 'box', rotExtra = 0, y0 = 0) => {
      const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      extraPieces.push({ type, x: L.x + v.x, z: L.z + v.z, y: y0 + sy / 2, sx, sy, sz, rot: yaw + rotExtra, tint: tint(z.color2), edge: tint(z.color), seed: Math.random() * 100 });
    };

    if (z.id === 'about') {
      piece(0, -4, 26, 240, 26, 'cyl');
      piece(0, -4, 30, 18, 30);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        piece(Math.cos(a) * 14, -4 + Math.sin(a) * 14, 2.2, 200 - k * 18, 7, 'box', -a);
      }
      const crown = new THREE.Mesh(new THREE.TorusGeometry(17, 0.5, 6, 48), glowMat(z.color, 2.4));
      crown.rotation.x = Math.PI / 2;
      crown.position.set(0, 236, -4);
      const crown2 = crown.clone();
      crown2.scale.setScalar(0.8);
      crown2.position.y = 252;
      root.add(crown, crown2);
      animated.push((t) => { crown.rotation.z = t * 0.2; crown2.position.y = 252 + Math.sin(t) * 3; });
      // holographic gate
      const gate = new THREE.Mesh(new THREE.TorusGeometry(7, 0.25, 6, 40, Math.PI), glowMat(z.color, 2.2));
      gate.position.set(0, 0, 16);
      const gate2 = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.12, 4, 40, Math.PI), glowMat(z.color2, 2.2));
      gate2.position.set(0, 0, 17.5);
      root.add(gate, gate2);
      sign.position.set(0, 17, 17.5);
    } else if (z.id === 'services') {
      piece(-6, -6, 22, 34, 20);
      piece(9, -8, 14, 52, 14);
      piece(-10, 8, 12, 22, 14);
      piece(10, 8, 12, 28, 12);
      // six floating service holograms
      const shapes = [
        new THREE.BoxGeometry(2.6, 1.6, 0.2),
        new THREE.BoxGeometry(1.4, 2.6, 1.4),
        new THREE.IcosahedronGeometry(1.4, 1),
        new THREE.TorusGeometry(1.1, 0.35, 6, 16),
        new THREE.OctahedronGeometry(1.4),
        new THREE.TorusKnotGeometry(0.9, 0.25, 48, 6),
      ];
      const cols = ['#ff2fb4', '#ffe14d', '#29e7ff', '#9dff3a', '#a64dff', '#ff2d55'];
      shapes.forEach((geo, k) => {
        const m = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), glowLineMat(cols[k]));
        m.position.set(-12.5 + k * 5, 5.5, 20);
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 1, 8), darkMetal(envMap));
        ped.position.set(-12.5 + k * 5, 0.5, 20);
        const halo = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.65, 32), glowMat(cols[k], 2));
        halo.rotation.x = -Math.PI / 2;
        halo.position.set(-12.5 + k * 5, 1.05, 20);
        root.add(m, ped, halo);
        animated.push((t) => { m.rotation.y = t * 0.8 + k; m.position.y = 5.5 + Math.sin(t * 1.5 + k) * 0.4; });
        lights.push({ x: 0, z: 0, local: [-12.5 + k * 5, 22], color: cols[k], r: 8 });
      });
      // canopy of neon strips over the market street
      for (let k = 0; k < 7; k++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(32, 0.15, 0.3), glowMat(cols[k % 6], 2));
        strip.position.set(0, 12 + (k % 2) * 0.8, 10 + k * 2);
        root.add(strip);
      }
      sign.position.set(0, 22, 18);
    } else if (z.id === 'works') {
      piece(0, -2, 30, 24, 30);
      piece(0, -2, 22, 14, 22, 'box', Math.PI / 4, 24);
      piece(-10, -10, 8, 70, 8);
      piece(10, -10, 8, 58, 8);
      // six project panels orbiting the gallery
      const ring = new THREE.Group();
      ring.position.set(0, 46, -2);
      root.add(ring);
      PROJECTS.forEach((p, k) => {
        const tex = adAtlas.texture.clone();
        const cell = k + 1;
        tex.repeat.set(1 / 4, 1 / 4);
        tex.offset.set((cell % 4) / 4, (3 - Math.floor(cell / 4)) / 4);
        tex.needsUpdate = true;
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
        const a = (k / 6) * Math.PI * 2;
        panel.position.set(Math.cos(a) * 24, 0, Math.sin(a) * 24);
        panel.lookAt(0, 0, 0);
        panel.rotateY(Math.PI);
        ring.add(panel);
      });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(24, 0.15, 4, 64), glowMat(z.color, 2.2));
      r1.rotation.x = Math.PI / 2;
      ring.add(r1);
      animated.push((t) => { ring.rotation.y = t * 0.12; });
      // gallery frame
      const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(31, 25, 31)), glowLineMat(z.color2));
      fr.position.set(0, 12.5, -2);
      root.add(fr);
      sign.position.set(0, 16, 14.5);
    } else if (z.id === 'process') {
      piece(0, -6, 32, 10, 26);
      const dome = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(15, 2)), glowLineMat(z.color, 1.6));
      dome.position.set(0, 10, -6);
      const domeSolid = new THREE.Mesh(new THREE.SphereGeometry(14.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0b1410', metalness: 0.8, roughness: 0.3, envMap, transparent: true, opacity: 0.85 }));
      domeSolid.position.set(0, 10, -6);
      root.add(domeSolid, dome);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3, 0), glowMat(z.color2, 2.5));
      core.position.set(0, 34, -6);
      root.add(core);
      animated.push((t) => { dome.rotation.y = t * 0.05; core.rotation.set(t * 0.6, t * 0.9, 0); core.position.y = 34 + Math.sin(t) * 1.5; });
      ['01', '02', '03', '04'].forEach((n, k) => {
        const x = -12 + k * 8;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9 + k * 3, 1.6), darkMetal(envMap));
        pillar.position.set(x, (9 + k * 3) / 2, 13);
        const ringP = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.1, 4, 24), glowMat(k % 2 ? z.color2 : z.color, 2.4));
        ringP.rotation.x = Math.PI / 2;
        root.add(pillar, ringP);
        const hgt = 9 + k * 3;
        animated.push((t) => { ringP.position.set(x, ((t * 3 + k * 2) % hgt), 13); });
      });
      sign.position.set(0, 22, 12);
    } else if (z.id === 'contact') {
      piece(0, -4, 24, 28, 24);
      piece(0, -4, 6, 150, 6, 'cyl', 0, 28);
      const dishes = [];
      for (let k = 0; k < 3; k++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(5 - k, 16, 8, 0, Math.PI * 2, 0, 1.0), darkMetal(envMap));
        d.position.set(0, 70 + k * 30, -4);
        d.rotation.x = Math.PI / 2;
        const rim = new THREE.Mesh(new THREE.TorusGeometry((5 - k) * 0.84, 0.12, 4, 32), glowMat(k % 2 ? z.color2 : z.color, 2.5));
        rim.position.z = (5 - k) * 0.54;
        d.add(rim);
        root.add(d);
        dishes.push(d);
      }
      animated.push((t) => dishes.forEach((d, k) => { d.rotation.z = t * (0.3 + k * 0.1); d.rotation.y = Math.sin(t * 0.4 + k) * 0.6; }));
      // signal pulses expanding over the street
      const pulses = [];
      for (let k = 0; k < 3; k++) {
        const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), glowMat(z.color, 2, 0.8));
        r.rotation.x = -Math.PI / 2;
        r.position.set(0, 0.06, 6);
        root.add(r);
        pulses.push(r);
      }
      animated.push((t) => pulses.forEach((r, k) => {
        const ph = (t * 0.35 + k / 3) % 1;
        r.scale.setScalar(4 + ph * 30);
        r.material.opacity = (1 - ph) * 0.8;
      }));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), glowMat('#ff2d55', 3));
      tip.position.set(0, 180, -4);
      root.add(tip);
      animated.push((t) => { tip.visible = Math.sin(t * 4) > 0; });
      sign.position.set(0, 20, 13.5);
    }

    root.add(sign);

    // Light beam visible from anywhere in the city
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 420, 16, 1, true), beamMaterial(z.color, 0.9));
    beam.geometry.translate(0, 210, 0);
    beam.position.set(0, 0, 0);
    root.add(beam);

    // Beacon on the street at the trigger point
    const beacon = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.8, 48), glowMat(z.color, 2.2, 0.9));
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.set(L.tx, 0.05, L.tz);
    const beacon2 = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 3, 32, 1, true), beamMaterial(z.color, 0.8));
    beacon2.geometry.translate(0, 1.5, 0);
    beacon2.position.set(L.tx, 0, L.tz);
    g.add(beacon, beacon2);

    // Resolve local light positions to world
    for (const l of lights) {
      if (!l.local) continue;
      const v = new THREE.Vector3(l.local[0], 0, l.local[1]).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      l.x = L.x + v.x;
      l.z = L.z + v.z;
      delete l.local;
    }
    const sw = new THREE.Vector3();
    root.updateMatrixWorld(true);
    sign.getWorldPosition(sw);
    lights.push({ x: L.tx, z: L.tz, r: 26, color: z.color, i: 1.2 });
    lights.push({ x: sw.x, z: sw.z, r: 30, color: z.color, i: 1 });

    zones.push({
      id: z.id,
      data: z,
      group: g,
      sign,
      beacon,
      beacon2,
      trigger: new THREE.Vector3(L.tx, 0, L.tz),
      signPos: sw.clone(),
      dir: new THREE.Vector2(L.dir[0], L.dir[1]),
    });
  }

  const update = (t, active) => {
    for (const f of animated) f(t);
    for (const z of zones) {
      const on = active === z.id;
      const k = on ? 1.6 + Math.sin(t * 6) * 0.25 : 1.0;
      z.sign.material.color.setScalar(k);
      z.beacon.scale.setScalar(1 + (on ? 0.15 : 0.05) * Math.sin(t * 3));
    }
  };

  return { zones, extraPieces, lights, update };
}

// Plaza centrepiece: giant metallic emblem over a holographic projector.
export function buildPlaza(envMap) {
  const g = new THREE.Group();
  const emblem = buildEmblem(envMap);
  emblem.scale.setScalar(7);
  emblem.position.set(0, 16, 0);
  g.add(emblem);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 2.5, 6), darkMetal(envMap));
  ped.position.y = 1.25;
  g.add(ped);
  const pedRing = new THREE.Mesh(new THREE.TorusGeometry(5, 0.12, 4, 6), glowMat('#ff2fb4', 2.5));
  pedRing.rotation.x = Math.PI / 2;
  pedRing.rotation.z = Math.PI / 6;
  pedRing.position.y = 2.55;
  g.add(pedRing);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(9, 2.5, 12, 32, 1, true), beamMaterial('#29e7ff', 0.5));
  cone.geometry.translate(0, 6, 0);
  cone.geometry.rotateX(Math.PI);
  cone.geometry.translate(0, 12 + 2.5, 0);
  g.add(cone);
  const rings = [];
  for (let k = 0; k < 3; k++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(10 + k * 2.2, 0.08, 4, 64), glowMat(['#29e7ff', '#ff2fb4', '#a64dff'][k], 2.4));
    r.position.y = 16;
    g.add(r);
    rings.push(r);
  }
  const update = (t) => {
    emblem.rotation.y = t * 0.35;
    emblem.position.y = 16 + Math.sin(t * 0.8) * 0.6;
    emblem.userData.core.rotation.y = -t * 2;
    rings.forEach((r, k) => r.rotation.set(t * (0.2 + k * 0.1) + k, t * (0.15 + k * 0.07), 0));
  };
  return { group: g, update, lights: [{ x: 0, z: 0, r: 34, color: '#ff2fb4', i: 1 }, { x: 0, z: 0, r: 18, color: '#29e7ff', i: 1 }] };
}

// Holographic sculptures along the boulevard medians.
export function buildMedians() {
  const g = new THREE.Group();
  const items = [];
  const geos = [
    new THREE.IcosahedronGeometry(2.2, 0),
    new THREE.TorusKnotGeometry(1.5, 0.4, 64, 6),
    new THREE.OctahedronGeometry(2.2, 0),
    new THREE.DodecahedronGeometry(2, 0),
  ].map((x) => new THREE.EdgesGeometry(x, 1));
  const cols = ['#29e7ff', '#ff2fb4', '#9dff3a', '#a64dff', '#ffe14d'];
  const base = new THREE.CylinderGeometry(1.4, 1.8, 0.8, 6);
  const baseMat = new THREE.MeshBasicMaterial({ color: '#0d0b16' });
  let k = 0;
  for (const s of [-110, -80, -55, 55, 80, 110]) {
    for (const axis of [0, 1]) {
      const x = axis ? s : 0, z = axis ? 0 : s;
      const m = new THREE.LineSegments(geos[k % geos.length], glowLineMat(cols[k % cols.length], 2));
      m.position.set(x, 5, z);
      const b = new THREE.Mesh(base, baseMat);
      b.position.set(x, 0.4, z);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.8, 3.6, 16, 1, true), beamMaterial(cols[k % cols.length], 0.35));
      cone.position.set(x, 2.6, z);
      g.add(m, b, cone);
      items.push(m);
      k++;
    }
  }
  return {
    group: g,
    update: (t) => items.forEach((m, i) => { m.rotation.set(t * 0.3 + i, t * 0.5 + i, 0); m.position.y = 5 + Math.sin(t + i) * 0.5; }),
    colliders: items.map((m) => ({ x: m.position.x, z: m.position.z, hx: 1.8, hz: 1.8 })),
  };
}
