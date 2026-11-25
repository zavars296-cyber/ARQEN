import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS, glowTexture, neon, particles } from './common.js';

// ARQEN symbol: hexagonal frame, chevron "A" and a floating core.
function hexShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 3;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

export function emblemGeometries() {
  const frame = hexShape(1);
  frame.holes.push(new THREE.Path(hexShape(0.84).getPoints().reverse()));
  const chev = new THREE.Shape();
  chev.moveTo(-0.6, -0.52);
  chev.lineTo(0, 0.6);
  chev.lineTo(0.6, -0.52);
  chev.lineTo(0.39, -0.52);
  chev.lineTo(0, 0.2);
  chev.lineTo(-0.39, -0.52);
  chev.closePath();
  const fg = new THREE.ExtrudeGeometry(frame, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 5, curveSegments: 1 });
  fg.translate(0, 0, -0.09);
  const cg = new THREE.ExtrudeGeometry(chev, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 5 });
  cg.translate(0, 0, -0.16);
  fg.computeVertexNormals();
  cg.computeVertexNormals();
  return { fg, cg };
}

export function buildEmblem(env, quality) {
  const { fg, cg } = emblemGeometries();
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#aab3d6', metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.6,
    iridescence: 0.9, iridescenceIOR: 1.6, clearcoat: 1, clearcoatRoughness: 0.08,
  });
  const chrome = new THREE.MeshStandardMaterial({ color: '#f4f6ff', metalness: 1, roughness: 0.1, envMap: env, envMapIntensity: 2.2 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(fg, glass));
  g.add(new THREE.Mesh(cg, chrome));
  // thin neon line inset in the frame
  const inner = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(hexShape(0.9).getPoints().map((p) => new THREE.Vector3(p.x, p.y, 0.15))),
    new THREE.LineBasicMaterial({ color: new THREE.Color(COLORS.cyan).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.8 })
  );
  g.add(inner);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), neon(COLORS.cyan, 3));
  core.position.set(0, -0.2, 0.05);
  g.add(core);
  g.userData.core = core;
  return g;
}

// Full-screen hero scene that lives behind the whole page.
export class HeroScene {
  constructor(renderer, env, quality) {
    this.quality = quality;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#040409');
    this.scene.fog = new THREE.FogExp2('#040409', 0.045);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    this.camera.position.set(0, 0, 9);

    this.rig = new THREE.Group(); // moved by scroll
    this.scene.add(this.rig);
    this.emblem = buildEmblem(env, quality);
    this.emblem.scale.setScalar(1.55);
    this.rig.add(this.emblem);

    // halo + rings
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(COLORS.violet).multiplyScalar(0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.scale.setScalar(9);
    halo.position.z = -1.6;
    this.rig.add(halo);
    const halo2 = halo.clone();
    halo2.material = halo.material.clone();
    halo2.material.color = new THREE.Color(COLORS.blue).multiplyScalar(0.8);
    halo2.scale.setScalar(5);
    halo2.position.set(0.6, -0.4, -1.2);
    this.rig.add(halo2);
    this.halo = halo;

    this.rings = [];
    [[2.55, COLORS.blue, 0.012], [2.9, COLORS.violet, 0.008], [3.4, COLORS.cyan, 0.005]].forEach(([r, c, t], i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.8), toneMapped: false, transparent: true, opacity: 0.75 - i * 0.15 }));
      ring.rotation.x = Math.PI / 2 + 0.35 - i * 0.18;
      ring.rotation.y = i * 0.3;
      this.rig.add(ring);
      this.rings.push(ring);
    });
    // tick marks around the first ring for a precise, technical feel
    const ticks = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r0 = 2.62, r1 = i % 6 ? 2.7 : 2.82;
      ticks.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
    this.ticks = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: new THREE.Color('#9aa8ff'), transparent: true, opacity: 0.35 }));
    this.rig.add(this.ticks);

    // lights that sweep across the metal
    this.l1 = new THREE.PointLight(COLORS.blue, 30, 12, 1.6);
    this.l2 = new THREE.PointLight(COLORS.violet, 30, 12, 1.6);
    this.l3 = new THREE.PointLight('#ffffff', 8, 10, 2);
    this.rig.add(this.l1, this.l2, this.l3);

    // floating geometry
    this.floaters = [];
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#b9c2ff', metalness: 0.2, roughness: 0.1, envMap: env, envMapIntensity: 1.2, transparent: true, opacity: 0.38, clearcoat: 1, iridescence: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#2a2c3a', metalness: 1, roughness: 0.25, envMap: env, envMapIntensity: 1.3 });
    const items = [
      [new THREE.TorusGeometry(0.7, 0.05, 16, 80), metalMat, [-5.2, 2.2, -4]],
      [new THREE.IcosahedronGeometry(0.55, 0), glassMat, [5.4, 1.8, -5]],
      [new RoundedBoxGeometry(0.9, 0.9, 0.9, 4, 0.12), glassMat, [-4.4, -2.4, -3]],
      [new THREE.OctahedronGeometry(0.4, 0), metalMat, [4.6, -2.6, -2.5]],
      [new THREE.TorusGeometry(1.6, 0.025, 8, 120), metalMat, [6.5, -0.5, -9]],
      [new THREE.SphereGeometry(0.22, 32, 16), metalMat, [-2.8, 3.1, -6]],
      [new THREE.CylinderGeometry(0.05, 0.05, 3.4, 12), metalMat, [-7, 0.2, -8]],
      [new THREE.TetrahedronGeometry(0.45, 0), glassMat, [2.6, 3.3, -7]],
    ];
    items.forEach(([geo, mat, p], i) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...p);
      m.userData = { base: new THREE.Vector3(...p), sp: 0.15 + (i % 4) * 0.06, ph: i * 1.7 };
      this.scene.add(m);
      this.floaters.push(m);
    });

    // perspective floor grid that fades into fog
    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80, 1, 1),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(COLORS.blue) } },
        vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
        fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec3 vW;
          void main(){ vec2 p = vW.xz + vec2(0.0, uTime*0.4);
            vec2 g = abs(fract(p/1.2-0.5)-0.5)/fwidth(p/1.2);
            float line = 1.0 - min(min(g.x,g.y),1.0);
            float fade = smoothstep(26.0, 2.0, length(vW.xz)) * smoothstep(-1.0, 4.0, vW.z + 10.0);
            gl_FragColor = vec4(uColor*line*fade*0.55, line*fade*0.55);
            #include <colorspace_fragment>
          }`,
      })
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -3.2;
    this.grid = grid;
    this.scene.add(grid);

    this.dust = particles(quality === 'high' ? 1400 : 600, [22, 14, 14], ['#8fb0ff', '#a98bff', '#ffffff', '#5be4ff'], 0.022);
    this.dust.material.uniforms.uPR.value = renderer.getPixelRatio();
    this.scene.add(this.dust);

    this.mouse = new THREE.Vector2();
    this.smooth = new THREE.Vector2();
    this.state = { x: 0, y: 0, z: 0, s: 1, ry: 0, dim: 0, scroll: 0 };
    this.hover = 0;
  }

  setPixelRatio(pr) {
    this.dust.material.uniforms.uPR.value = pr;
  }

  update(t, dt, target, aspect) {
    const st = this.state;
    const k = 1 - Math.exp(-dt * 3.2);
    for (const key of Object.keys(target)) st[key] += (target[key] - st[key]) * k;
    this.smooth.lerp(this.mouse, 1 - Math.exp(-dt * 4));

    const narrow = aspect < 0.8;
    this.rig.position.set(st.x * (narrow ? 0.12 : 1), st.y + (narrow ? 0.9 : 0), st.z);
    this.rig.scale.setScalar(st.s * (narrow ? 0.72 : 1));
    this.emblem.rotation.set(
      Math.sin(t * 0.4) * 0.06 - this.smooth.y * 0.35,
      Math.sin(t * 0.25) * 0.35 + this.smooth.x * 0.55 + st.ry,
      0
    );
    this.emblem.position.y = Math.sin(t * 0.8) * 0.06;
    this.emblem.userData.core.rotation.y = t * 1.6;
    this.emblem.userData.core.scale.setScalar(1 + Math.sin(t * 2.4) * 0.12);
    this.rings[0].rotation.z = t * 0.12;
    this.rings[1].rotation.z = -t * 0.08;
    this.rings[2].rotation.z = t * 0.05;
    this.ticks.rotation.z = -t * 0.03;
    this.l1.position.set(Math.cos(t * 0.6) * 3.2, Math.sin(t * 0.4) * 1.5, 2.2);
    this.l2.position.set(Math.cos(t * 0.6 + Math.PI) * 3.2, Math.cos(t * 0.5) * 1.5, 2.2);
    this.l3.position.set(this.smooth.x * 3, this.smooth.y * 2 + 1, 3);
    this.halo.material.opacity = 0.85 - st.dim * 0.5;

    this.floaters.forEach((m, i) => {
      const u = m.userData;
      m.position.set(
        u.base.x + Math.sin(t * u.sp + u.ph) * 0.3 - this.smooth.x * (0.2 + i * 0.05),
        u.base.y + Math.cos(t * u.sp * 1.2 + u.ph) * 0.35 + st.scroll * (0.4 + (i % 3) * 0.35),
        u.base.z
      );
      m.rotation.set(t * u.sp, t * u.sp * 1.3 + u.ph, 0);
    });
    this.grid.material.uniforms.uTime.value = t;
    this.dust.material.uniforms.uTime.value = t;
    this.dust.position.y = st.scroll * 1.2;

    this.camera.aspect = aspect;
    this.camera.fov = narrow ? 50 : 35;
    this.camera.position.set(this.smooth.x * 0.25, this.smooth.y * 0.18, 9);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }
}
