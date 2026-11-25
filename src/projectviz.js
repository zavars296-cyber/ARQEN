import * as THREE from 'three';
import { mulberry32 } from './three/common.js';

// Real-time hero visuals for each concept project page. Each builder fills a
// small scene and returns an update(t) callback. One renderer is created when
// a project page opens and disposed when it closes.

const glow = (c, k = 2) => new THREE.Color(c).multiplyScalar(k);

function envFor(renderer, colors) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#040308');
  colors.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 10), new THREE.MeshBasicMaterial({ color: glow(c, 3), side: THREE.DoubleSide }));
    const a = (i / colors.length) * Math.PI * 2;
    m.position.set(Math.cos(a) * 6, 2, Math.sin(a) * 6);
    m.lookAt(0, 0, 0);
    s.add(m);
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: glow('#ffffff', 0.8), side: THREE.DoubleSide }));
  top.position.y = 7;
  top.rotation.x = Math.PI / 2;
  s.add(top);
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return t;
}

function speedLines(count, colors, spread = 14, len = 6) {
  const rng = mulberry32(7);
  const pos = new Float32Array(count * 6), col = new Float32Array(count * 6), seed = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2, r = 3 + rng() * spread;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.6, z = -rng() * 120;
    pos.set([x, y, z, x, y, z - len], i * 6);
    const c = glow(colors[i % colors.length], 2.2);
    col.set([c.r, c.g, c.b, c.r * 0.1, c.g * 0.1, c.b * 0.1], i * 6);
    seed[i * 2] = seed[i * 2 + 1] = rng();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true,
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 40 } },
    vertexShader: `uniform float uTime; uniform float uSpeed; attribute float aSeed; varying vec3 vC;
      void main(){ vec3 p = position; p.z = mod(p.z + uTime*uSpeed*(0.6+aSeed), 120.0) - 110.0; vC = color;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = vec4(vC,1.0); }`,
  });
  return new THREE.LineSegments(g, m);
}

export const BUILDERS = {
  velocity(scene, camera, renderer) {
    const env = envFor(renderer, ['#ff2d55', '#ff8a3d', '#ffffff']);
    camera.position.set(0, 3, 14);
    const lines = speedLines(500, ['#ff2d55', '#ff8a3d', '#ffffff']);
    scene.add(lines);
    // stylised coupe from an extruded side profile
    const s = new THREE.Shape();
    s.moveTo(-4.6, 0.3);
    s.bezierCurveTo(-4.7, 0.9, -4.3, 1.1, -3.6, 1.2);
    s.lineTo(-1.6, 1.35);
    s.bezierCurveTo(-0.9, 2.15, 0.9, 2.2, 1.8, 1.5);
    s.bezierCurveTo(3.0, 1.25, 4.4, 1.0, 4.7, 0.55);
    s.lineTo(4.6, 0.2);
    s.lineTo(-4.6, 0.2);
    const body = new THREE.ExtrudeGeometry(s, { depth: 3.4, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.4, bevelSegments: 4, curveSegments: 16 });
    body.translate(0, 0, -1.7);
    const car = new THREE.Group();
    car.add(new THREE.Mesh(body, new THREE.MeshStandardMaterial({ color: '#3a3a48', metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 1.4 })));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 3.8), new THREE.MeshBasicMaterial({ color: glow('#ff2d55', 3), toneMapped: false }));
    strip.position.set(-4.95, 0.75, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.4), new THREE.MeshBasicMaterial({ color: glow('#ffffff', 3), toneMapped: false }));
    head.position.set(5.0, 0.7, 0);
    car.add(strip, head);
    for (const x of [-2.8, 2.9]) for (const z of [-1.9, 1.9]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 24), new THREE.MeshStandardMaterial({ color: '#0a0a0c', metalness: 0.6, roughness: 0.4, envMap: env }));
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.4, z);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: glow('#ff8a3d', 2.5), toneMapped: false }));
      rim.position.set(x, 0.4, z + Math.sign(z) * 0.27);
      car.add(w, rim);
    }
    car.position.y = -1;
    scene.add(car);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#050507', metalness: 0.6, roughness: 0.55, envMap: env, envMapIntensity: 0.25 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    scene.add(floor);
    return (t) => {
      lines.material.uniforms.uTime.value = t;
      car.rotation.y = t * 0.35;
      camera.position.set(Math.sin(t * 0.15) * 2, 3.2, 14);
      camera.lookAt(0, 0, 0);
    };
  },

  nexora(scene, camera, renderer) {
    const env = envFor(renderer, ['#2a6bff', '#29e7ff', '#c8d4ff']);
    camera.position.set(0, 0, 12);
    const card = (w, h) => {
      const s = new THREE.Shape();
      const r = 0.35;
      s.moveTo(-w / 2 + r, -h / 2);
      s.lineTo(w / 2 - r, -h / 2);
      s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r);
      s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r);
      s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 });
    };
    const cards = [];
    ['#2a6bff', '#0d1430', '#29e7ff'].forEach((c, i) => {
      const g = new THREE.Group();
      const geo = card(5, 3.1);
      g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.15, envMap: env })));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: glow('#29e7ff', 2), toneMapped: false })));
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: '#e8d48a', metalness: 1, roughness: 0.3, envMap: env }));
      chip.position.set(-1.6, 0.4, 0.14);
      g.add(chip);
      g.position.set((i - 1) * 1.2, (i - 1) * -0.6, (i - 1) * -1.6);
      scene.add(g);
      cards.push(g);
    });
    const rings = [];
    for (let k = 0; k < 4; k++) {
      const n = 220;
      const p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = 5 + k * 1.1;
        p.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: glow(k % 2 ? '#29e7ff' : '#2a6bff', 2), size: 0.06, toneMapped: false }));
      pts.rotation.x = 1.1 + k * 0.12;
      scene.add(pts);
      rings.push(pts);
    }
    return (t) => {
      cards.forEach((c, i) => {
        c.rotation.set(Math.sin(t * 0.5 + i) * 0.2 - 0.2, Math.sin(t * 0.4 + i) * 0.45, 0);
        c.position.y = (i - 1) * -0.6 + Math.sin(t + i) * 0.2;
      });
      rings.forEach((r, k) => (r.rotation.z = t * (0.1 + k * 0.05) * (k % 2 ? -1 : 1)));
    };
  },

  vanta(scene, camera) {
    camera.position.set(0, 0, 9);
    const geo = new THREE.PlaneGeometry(18, 12, 160, 110);
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vH;
        float h(vec2 p){ return sin(p.x*0.7+uTime*0.8)*0.6 + sin(p.y*1.1-uTime*0.6+p.x*0.4)*0.45 + sin((p.x+p.y)*1.7+uTime*1.2)*0.15; }
        void main(){ vec3 p = position; float e = 0.01;
          p.z = h(p.xy);
          vec3 dx = vec3(e,0.0,h(p.xy+vec2(e,0.0))-p.z), dy = vec3(0.0,e,h(p.xy+vec2(0.0,e))-p.z);
          vN = normalize(normalMatrix*cross(dx,dy)); vec4 mv = modelViewMatrix*vec4(p,1.0); vV = normalize(-mv.xyz); vH = p.z;
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; varying float vH;
        void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
          float f = pow(1.0-abs(dot(n,vV)), 2.5);
          vec3 iri = 0.5+0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+f*0.8+vH*0.2));
          vec3 c = vec3(0.012) + f*mix(vec3(0.7,0.55,1.0), iri, 0.35)*0.9;
          float spec = pow(max(dot(reflect(-vV,n), normalize(vec3(0.3,0.8,0.5))),0.0), 40.0);
          c += spec*vec3(0.9,0.88,0.85);
          gl_FragColor = vec4(c,1.0);
          #include <colorspace_fragment>
        }`,
    });
    const cloth = new THREE.Mesh(geo, mat);
    cloth.rotation.x = -0.5;
    scene.add(cloth);
    return (t) => {
      mat.uniforms.uTime.value = t;
      cloth.rotation.z = Math.sin(t * 0.1) * 0.1;
    };
  },

  monolith(scene, camera) {
    camera.position.set(16, 10, 18);
    camera.lookAt(0, 2, 0);
    scene.add(new THREE.HemisphereLight('#6a6070', '#0d0d0f', 0.5));
    const sun = new THREE.DirectionalLight('#ffb347', 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
    scene.add(sun);
    const mat = new THREE.MeshStandardMaterial({ color: '#b9b4ac', roughness: 0.85 });
    const darkM = new THREE.MeshStandardMaterial({ color: '#3a3a40', roughness: 0.7 });
    const blocks = [
      [0, 0, 4, 12, 4], [5, -2, 6, 5, 3], [-5, 2, 3, 8, 7], [2, 6, 8, 2.5, 3], [-3, -6, 9, 3.5, 2.5], [6.5, 4, 2, 9, 2],
    ];
    blocks.forEach(([x, z, w, h, d], i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 3 === 1 ? darkM : mat);
      m.position.set(x, h / 2, z);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    });
    const gl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: glow('#ffb347', 3), toneMapped: false }));
    gl.position.set(0, 9, 2.06);
    scene.add(gl);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(60, 30, '#3a3a40', '#26262b');
    grid.position.y = 0.01;
    scene.add(grid);
    renderer_shadow = true;
    return (t) => {
      const a = t * 0.25;
      sun.position.set(Math.cos(a) * 20, 12 + Math.sin(t * 0.2) * 4, Math.sin(a) * 20);
      camera.position.set(Math.cos(t * 0.05) * 22, 11, Math.sin(t * 0.05) * 22);
      camera.lookAt(0, 3, 0);
    };
  },

  syntra(scene, camera) {
    camera.position.set(0, 0, 16);
    const rng = mulberry32(11);
    const n = 160;
    const nodes = [];
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3((rng() - 0.5) * 22, (rng() - 0.5) * 12, (rng() - 0.5) * 10);
      nodes.push(v);
    }
    const pg = new THREE.BufferGeometry().setFromPoints(nodes);
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: glow('#9dff3a', 2.5), size: 0.18, toneMapped: false }));
    scene.add(pts);
    const segs = [], ph = [];
    nodes.forEach((a, i) => {
      nodes.forEach((b, j) => {
        if (j <= i) return;
        if (a.distanceTo(b) < 3.6) {
          segs.push(a.x, a.y, a.z, b.x, b.y, b.z);
          const s = rng();
          ph.push(0, s, 1, s);
        }
      });
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    lg.setAttribute('aT', new THREE.Float32BufferAttribute(ph.filter((_, k) => k % 2 === 0), 1));
    lg.setAttribute('aS', new THREE.Float32BufferAttribute(ph.filter((_, k) => k % 2 === 1), 1));
    const lm = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aT; attribute float aS; varying float vT; varying float vS;
        void main(){ vT = aT; vS = aS; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; varying float vT; varying float vS;
        void main(){ float p = fract(uTime*0.4 + vS*7.0); float pulse = smoothstep(0.12,0.0,abs(vT-p));
          vec3 c = mix(vec3(0.05,0.35,0.4), vec3(0.6,2.0,0.4), pulse);
          gl_FragColor = vec4(c*0.8,1.0);
          #include <colorspace_fragment>
        }`,
    });
    const net = new THREE.LineSegments(lg, lm);
    const g = new THREE.Group();
    g.add(pts, net);
    scene.add(g);
    return (t) => {
      lm.uniforms.uTime.value = t;
      g.rotation.y = Math.sin(t * 0.15) * 0.5;
      g.rotation.x = Math.sin(t * 0.1) * 0.15;
    };
  },

  afterdark(scene, camera) {
    camera.position.set(0, 0, 6);
    const frames = [];
    const cols = ['#ff2fb4', '#a64dff', '#ffe14d', '#29e7ff'];
    for (let i = 0; i < 26; i++) {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(8, 5, 0.01));
      const f = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: glow(cols[i % 4], 2.5), toneMapped: false, transparent: true }));
      f.userData.z = -i * 4;
      scene.add(f);
      frames.push(f);
    }
    const grid = new THREE.GridHelper(200, 80, new THREE.Color('#ff2fb4').multiplyScalar(1.5), new THREE.Color('#a64dff').multiplyScalar(0.8));
    grid.position.y = -2.5;
    scene.add(grid);
    const sunGeo = new THREE.CircleGeometry(9, 48);
    const sunMat = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vUv; void main(){ vec3 c = mix(vec3(1.0,0.15,0.6), vec3(1.0,0.85,0.3), vUv.y);
        float cut = step(0.5, fract(vUv.y*14.0)) + step(0.55, vUv.y); if (cut < 0.5) discard;
        gl_FragColor = vec4(c*1.3,1.0);
        #include <colorspace_fragment>
        }`,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 3, -100);
    scene.add(sun);
    return (t) => {
      frames.forEach((f, i) => {
        const z = ((f.userData.z + t * 14) % 104) - 100 + 6;
        f.position.z = z;
        f.rotation.z = Math.sin(t * 0.5 + i * 0.3) * 0.25;
        f.material.opacity = THREE.MathUtils.smoothstep(z, -100, -40) * THREE.MathUtils.smoothstep(-z, -6, 0);
      });
      grid.position.z = (t * 14) % 2.5;
      camera.position.x = Math.sin(t * 0.4) * 0.6;
      camera.lookAt(0, 0, -50);
    };
  },
};

let renderer_shadow = false;

export class ProjectViz {
  constructor(canvas, id) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    renderer_shadow = false;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#05040a');
    this.scene.fog = new THREE.Fog('#05040a', 30, 120);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    this.update = BUILDERS[id](this.scene, this.camera, this.renderer);
    this.renderer.shadowMap.enabled = renderer_shadow;
    this.t0 = performance.now();
    this.running = true;
    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      this.update((performance.now() - this.t0) / 1000);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 60 : 45;
    this.camera.updateProjectionMatrix();
  }
  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) [].concat(o.material).forEach((m) => m.dispose());
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
