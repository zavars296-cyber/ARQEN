import * as THREE from 'three';
import { studioEnv } from './common.js';
import { HeroScene } from './hero.js';
import { SERVICE_BUILDERS } from './services.js';
import { BUILDERS as PROJECT_BUILDERS } from '../projectviz.js';

// One WebGL canvas fixed behind the page. It draws the hero scene full screen,
// then draws each visible card scene into that card's rectangle (scissor),
// so the whole site uses a single GPU context.
export class Stage {
  constructor(canvas, quality) {
    this.quality = quality;
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false }));
    this.maxPR = quality === 'high' ? 1.75 : 1.5;
    r.setPixelRatio(Math.min(devicePixelRatio, this.maxPR));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = quality === 'high';
    r.autoClear = false;
    this.env = studioEnv(r);
    this.hero = new HeroScene(r, this.env, quality);
    this.views = [];
    // full-screen veil that darkens the hero scene behind content sections
    this.veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#040409', transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    this.veilScene = new THREE.Scene();
    this.veilScene.add(this.veil);
    this.veilCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.target = { x: 0, y: 0, z: 0, s: 1, ry: 0, dim: 0, scroll: 0 };
    this.clock = { last: performance.now(), t: 0 };
    this.paused = false;
    this.keys = [];
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.hero.mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    });
    if (window.DeviceOrientationEvent && matchMedia('(pointer: coarse)').matches) {
      addEventListener('deviceorientation', (e) => {
        if (e.gamma == null) return;
        this.hero.mouse.set(THREE.MathUtils.clamp(e.gamma / 30, -1, 1), THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1));
      });
    }
    document.querySelectorAll('[data-view]').forEach((el) => this.addView(el));
    this.io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const v = this.views.find((x) => x.el === en.target);
      if (v) v.visible = en.isIntersecting;
    }), { rootMargin: '100px' });
    this.views.forEach((v) => this.io.observe(v.el));
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  addView(el) {
    const id = el.dataset.view;
    const v = { el, id, visible: false, built: false, hover: 0 };
    el.addEventListener('pointerenter', () => (v.hovering = true));
    el.addEventListener('pointerleave', () => (v.hovering = false));
    const card = el.closest('[data-card]');
    if (card) {
      card.addEventListener('pointerenter', () => (v.hovering = true));
      card.addEventListener('pointerleave', () => (v.hovering = false));
    }
    this.views.push(v);
  }

  buildView(v) {
    v.scene = new THREE.Scene();
    v.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300);
    if (SERVICE_BUILDERS[v.id]) {
      v.scene.background = new THREE.Color('#0b0b15');
      v.update = SERVICE_BUILDERS[v.id](v.scene, v.camera, this.env, this.quality);
      v.kind = 'service';
    } else {
      const pid = v.id.replace('work-', '');
      v.scene.background = new THREE.Color('#05040a');
      v.scene.fog = new THREE.Fog('#05040a', 30, 120);
      v.camera.fov = 42;
      const upd = PROJECT_BUILDERS[pid](v.scene, v.camera, this.renderer);
      v.update = (t) => upd(t);
      v.kind = 'project';
    }
    // wrap content in a pivot that leans toward the pointer
    const pivot = new THREE.Group();
    [...v.scene.children].forEach((c) => pivot.add(c));
    v.scene.add(pivot);
    v.pivot = pivot;
    v.built = true;
  }

  // Scroll choreography: emblem position per section, read from the DOM.
  setKeyframes(list) {
    this.keys = list; // [{el, x, y, z, s, ry, dim}]
  }

  computeTarget() {
    const y = scrollY + innerHeight * 0.5;
    const ks = this.keys.map((k) => ({ ...k, at: k.el.offsetTop + k.el.offsetHeight * 0.5 }));
    let a = ks[0], b = ks[0];
    for (let i = 0; i < ks.length; i++) {
      if (ks[i].at <= y) a = ks[i];
      if (ks[i].at >= y) { b = ks[i]; break; }
      b = ks[i];
    }
    const span = b.at - a.at;
    let f = span > 0 ? (y - a.at) / span : 0;
    f = f * f * (3 - 2 * f);
    for (const key of ['x', 'y', 'z', 's', 'ry', 'dim']) this.target[key] = a[key] + (b[key] - a[key]) * f;
    this.target.scroll = scrollY / innerHeight;
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.canvas.style.width = innerWidth + 'px';
    this.canvas.style.height = innerHeight + 'px';
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.clock.last) / 1000);
    this.clock.last = now;
    if (this.paused || document.hidden) return;
    this.clock.t += dt;
    const t = this.clock.t;
    const r = this.renderer;
    const W = innerWidth, H = innerHeight;

    if (this.keys.length) this.computeTarget();
    this.hero.update(t, dt, this.target, W / H);
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    r.clear();
    r.render(this.hero.scene, this.hero.camera);
    let dim = this.hero.state.dim * 0.62;
    if (W / H < 0.8) dim = Math.max(dim, THREE.MathUtils.clamp(this.hero.state.scroll - 0.35, 0, 1) * 0.82);
    this.veil.material.opacity = dim;
    if (this.veil.material.opacity > 0.01) r.render(this.veilScene, this.veilCam);

    r.setScissorTest(true);
    for (const v of this.views) {
      if (!v.visible) continue;
      const rect = v.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > H || rect.width < 2) continue;
      if (!v.built) this.buildView(v);
      v.hover += ((v.hovering ? 1 : 0) - v.hover) * Math.min(1, dt * 5);
      const x = rect.left, y = H - rect.bottom;
      r.setViewport(x, y, rect.width, rect.height);
      r.setScissor(x, y, rect.width, rect.height);
      v.camera.aspect = rect.width / rect.height;
      v.camera.updateProjectionMatrix();
      v.update(t, v.hover, dt);
      const px = +(v.el.dataset.px || 0), py = +(v.el.dataset.py || 0);
      const kk = Math.min(1, dt * 4);
      v.pivot.rotation.y += (px * 0.5 - v.pivot.rotation.y) * kk;
      v.pivot.rotation.x += (py * 0.3 - v.pivot.rotation.x) * kk;
      if (v.kind === 'project') v.camera.updateProjectionMatrix();
      r.clear();
      r.render(v.scene, v.camera);
    }
    r.setScissorTest(false);
    if (!this.first) {
      this.first = true;
      document.body.classList.add('gl-ready');
    }
    this.adapt(dt);
  }

  adapt(dt) {
    const p = (this.perf ||= { n: 0, acc: 0, checks: 0 });
    if (p.checks > 4) return;
    p.n++;
    p.acc += dt;
    if (p.acc < 2) return;
    const fps = p.n / p.acc;
    p.n = p.acc = 0;
    p.checks++;
    const pr = this.renderer.getPixelRatio();
    if (fps < 40 && pr > 1) {
      const next = Math.max(1, pr - 0.3);
      this.renderer.setPixelRatio(next);
      this.hero.setPixelRatio(next);
      this.resize();
    }
  }
}
