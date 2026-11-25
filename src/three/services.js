import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS, neon, mulberry32, glowTexture } from './common.js';

// Small 3D compositions shown inside the service cards. Each builder fills
// a scene and returns update(t, hover) where hover eases from 0 to 1.

const chromeMat = (env, c = '#e3e7f6', r = 0.16) => new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: r, envMap: env, envMapIntensity: 2.4 });
const darkMetal = (env) => new THREE.MeshStandardMaterial({ color: '#555a75', metalness: 1, roughness: 0.28, envMap: env, envMapIntensity: 2 });
const glassMat = (env, c = '#c3cbff', o = 0.45) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.1, roughness: 0.08, envMap: env, envMapIntensity: 2.4, transparent: true, opacity: o, clearcoat: 1, iridescence: 0.6, side: THREE.DoubleSide });

function addGlow(scene, color, size, z = -2) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color).multiplyScalar(1.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size);
  s.position.z = z;
  scene.add(s);
  return s;
}

export const SERVICE_BUILDERS = {
  'svc-web'(scene, camera, env) {
    camera.position.set(0, 0.4, 6);
    addGlow(scene, COLORS.blue, 7);
    const panels = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.7, 0.06, 3, 0.06), glassMat(env, i === 2 ? '#dfe4ff' : '#9aa6ff', 0.32 + i * 0.12)));
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.08), darkMetal(env));
      bar.position.y = 0.77;
      g.add(bar);
      [0.12, 0.2, 0.28].forEach((x, k) => {
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), neon(['#ff5f7a', '#ffd45f', '#5fff9c'][k], 1.4));
        d.position.set(-1.25 + x, 0.77, 0.05);
        g.add(d);
      });
      const rng = mulberry32(5 + i);
      for (let l = 0; l < 6; l++) {
        const w = 0.4 + rng() * 1.3;
        const line = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.06), neon(l % 3 === 0 ? COLORS.violet : l % 3 === 1 ? COLORS.blue : COLORS.cyan, i === 2 ? 1.6 : 0.8));
        line.position.set(-1.1 + w / 2 + (l % 2) * 0.25, 0.48 - l * 0.2, 0.05);
        g.add(line);
      }
      g.position.set((i - 1) * 0.45, (1 - i) * 0.3, (i - 1) * 0.9);
      scene.add(g);
      panels.push(g);
    }
    return (t, h) => {
      panels.forEach((p, i) => {
        const spread = 1 + h * 0.8;
        p.position.set((i - 1) * 0.45 * spread, (1 - i) * 0.3 * spread + Math.sin(t + i) * 0.05, (i - 1) * 0.9 * spread);
        p.rotation.set(-0.15 + Math.sin(t * 0.5) * 0.04, -0.45 + Math.sin(t * 0.4) * 0.12 + h * 0.2, 0);
      });
    };
  },

  'svc-uiux'(scene, camera, env) {
    camera.position.set(0, 3.2, 5.2);
    camera.lookAt(0, 0, 0);
    addGlow(scene, COLORS.violet, 8, -3);
    const tiles = [];
    const tileGeo = new RoundedBoxGeometry(0.8, 0.12, 0.8, 3, 0.05);
    const base = darkMetal(env);
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) {
      const m = new THREE.Mesh(tileGeo, base);
      m.position.set(x * 0.95, 0, z * 0.95);
      scene.add(m);
      tiles.push(m);
    }
    const hi = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.14, 0.82, 3, 0.05), new THREE.MeshStandardMaterial({ color: '#6c4dff', emissive: new THREE.Color(COLORS.violet), emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.3, envMap: env }));
    scene.add(hi);
    const cursor = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 3), chromeMat(env, '#ffffff', 0.1));
    cursor.rotation.x = Math.PI;
    scene.add(cursor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.015, 8, 64), neon(COLORS.cyan, 1.8));
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    const group = new THREE.Group();
    scene.children.filter((c) => !(c instanceof THREE.Sprite)).forEach((c) => group.add(c));
    scene.add(group);
    const path = [0, 4, 8, 2, 6];
    return (t, h) => {
      const k = t * (0.6 + h * 1.2);
      const i = Math.floor(k) % path.length;
      const f = k % 1;
      const a = tiles[path[i]].position, b = tiles[path[(i + 1) % path.length]].position;
      const e = f < 0.6 ? 0 : (f - 0.6) / 0.4;
      const s = e * e * (3 - 2 * e);
      hi.position.set(a.x + (b.x - a.x) * s, 0.12 + Math.sin(s * Math.PI) * 0.3, a.z + (b.z - a.z) * s);
      ring.position.set(hi.position.x, 0.08, hi.position.z);
      ring.scale.setScalar(1 + (f < 0.6 ? f : 0) * 0.5);
      cursor.position.set(hi.position.x + 0.35, 0.9 + Math.sin(t * 3) * 0.05, hi.position.z + 0.35);
      tiles.forEach((m, j) => (m.position.y = Math.sin(t * 1.5 + j) * 0.03 * (1 + h * 3)));
      group.rotation.y = Math.sin(t * 0.3) * 0.25 + h * 0.3;
    };
  },

  'svc-auto'(scene, camera, env) {
    camera.position.set(0, 0, 6.2);
    addGlow(scene, COLORS.cyan, 6.5);
    const gear = (teeth, r, depth) => {
      const s = new THREE.Shape();
      const inner = r * 0.82;
      for (let i = 0; i < teeth * 2; i++) {
        const a0 = (i / (teeth * 2)) * Math.PI * 2;
        const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
        const rr = i % 2 ? inner : r;
        if (i === 0) s.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
        s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
        s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
      }
      const hole = new THREE.Path();
      hole.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true);
      s.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 16 });
      g.translate(0, 0, -depth / 2);
      return g;
    };
    const g1 = new THREE.Mesh(gear(14, 1.1, 0.25), chromeMat(env));
    const g2 = new THREE.Mesh(gear(9, 0.72, 0.25), chromeMat(env, '#9fb0ff', 0.2));
    const g3 = new THREE.Mesh(gear(7, 0.56, 0.25), darkMetal(env));
    g1.position.set(-0.75, 0.2, 0);
    g2.position.set(0.97, 0.55, 0);
    g3.position.set(0.45, -1.05, 0);
    scene.add(g1, g2, g3);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 8, 48), neon(COLORS.cyan, 2.2));
    glowRing.position.copy(g1.position).setZ(0.16);
    scene.add(glowRing);
    // data pulses travelling along a path
    const dots = [];
    for (let i = 0; i < 5; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), neon(i % 2 ? COLORS.blue : COLORS.cyan, 2.4));
      scene.add(d);
      dots.push(d);
    }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.4, -1.3, 0.3), new THREE.Vector3(-0.8, -1.5, 0.5), new THREE.Vector3(0.6, 0.2, 0.6), new THREE.Vector3(2.4, 1.4, 0.3)]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.01, 6), neon(COLORS.blue, 1));
    scene.add(tube);
    let a = 0;
    return (t, h, dt) => {
      a += dt * (0.5 + h * 1.6);
      g1.rotation.z = a;
      g2.rotation.z = -a * (14 / 9) + 0.17;
      g3.rotation.z = -a * (14 / 7);
      dots.forEach((d, i) => d.position.copy(curve.getPoint((t * (0.15 + h * 0.25) + i / 5) % 1)));
      scene.rotation.y = Math.sin(t * 0.3) * 0.2;
    };
  },

  'svc-exp'(scene, camera, env, quality) {
    camera.position.set(0, 0, 5.4);
    addGlow(scene, COLORS.violet, 7.5);
    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 0),
      quality === 'high'
        ? new THREE.MeshPhysicalMaterial({ color: '#e4e8ff', roughness: 0.04, transmission: 1, thickness: 1.2, ior: 1.6, iridescence: 1, envMap: env, envMapIntensity: 1.4 })
        : glassMat(env, '#c9d0ff', 0.5)
    );
    scene.add(ico);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(ico.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0.6 }));
    ico.add(edges);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), neon(COLORS.violet, 2.6));
    scene.add(core);
    const light = new THREE.PointLight(COLORS.violet, 12, 6);
    scene.add(light);
    const rings = [0, 1].map((i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.7 + i * 0.25, 0.012, 8, 120), neon(i ? COLORS.blue : COLORS.cyan, 1.8));
      r.rotation.x = 1.2 + i * 0.4;
      scene.add(r);
      return r;
    });
    const moons = [0, 1, 2].map((i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), chromeMat(env, '#ffffff', 0.1));
      scene.add(m);
      return m;
    });
    return (t, h) => {
      ico.rotation.set(t * 0.3, t * (0.4 + h * 0.8), 0);
      core.rotation.set(-t * 0.6, -t * 0.8, 0);
      core.scale.setScalar(1 + Math.sin(t * 2) * 0.08 + h * 0.25);
      rings[0].rotation.z = t * 0.4;
      rings[1].rotation.z = -t * 0.3;
      moons.forEach((m, i) => {
        const a = t * (0.6 + i * 0.2 + h) + i * 2.1;
        m.position.set(Math.cos(a) * (1.75 + i * 0.12), Math.sin(a * 1.3) * 0.5, Math.sin(a) * (1.75 + i * 0.12));
      });
    };
  },

  'svc-ai'(scene, camera) {
    camera.position.set(0, 0, 5.6);
    addGlow(scene, COLORS.blue, 7);
    const rng = mulberry32(21);
    const n = 140;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const u = rng() * 2 - 1, a = rng() * Math.PI * 2, r = 1.55 + (rng() - 0.5) * 0.15;
      const s = Math.sqrt(1 - u * u);
      pts.push(new THREE.Vector3(Math.cos(a) * s * r, u * r, Math.sin(a) * s * r));
    }
    const pg = new THREE.BufferGeometry().setFromPoints(pts);
    const dotMat = new THREE.PointsMaterial({ color: new THREE.Color('#bcd0ff').multiplyScalar(1.6), size: 0.06, toneMapped: false });
    const points = new THREE.Points(pg, dotMat);
    const seg = [], tt = [], ss = [];
    pts.forEach((a, i) => pts.forEach((b, j) => {
      if (j <= i || a.distanceTo(b) > 0.62) return;
      seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const s = rng();
      tt.push(0, 1);
      ss.push(s, s);
    }));
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    lg.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
    lg.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1));
    const lm = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uHover: { value: 0 } },
      vertexShader: 'attribute float aT; attribute float aS; varying float vT; varying float vS; void main(){ vT=aT; vS=aS; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uTime; uniform float uHover; varying float vT; varying float vS;
        void main(){ float p = fract(uTime*(0.35+uHover*0.6) + vS*9.0); float pulse = smoothstep(0.15,0.0,abs(vT-p));
          vec3 c = mix(vec3(0.08,0.12,0.45), vec3(0.75,0.6,2.2), pulse);
          gl_FragColor = vec4(c*(0.6+uHover*0.5),1.0);
          #include <colorspace_fragment>
        }`,
    });
    const net = new THREE.LineSegments(lg, lm);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.violet).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0.85 }));
    const g = new THREE.Group();
    g.add(points, net, core);
    scene.add(g);
    return (t, h) => {
      lm.uniforms.uTime.value = t;
      lm.uniforms.uHover.value = h;
      g.rotation.set(Math.sin(t * 0.2) * 0.2, t * (0.15 + h * 0.4), 0);
      core.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06 + h * 0.15);
    };
  },
};
