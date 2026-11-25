import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/500.css';
import './style.css';

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { U, mulberry32 } from './world/common.js';
import { generateLayout, buildBuildings, buildGround, buildSky, bakeLightMap, BOUND, ZONE_LAYOUT } from './world/city.js';
import { buildNeon, buildLamps } from './world/neon.js';
import { Traffic, buildCrowd, Jellies, HoloFauna } from './world/life.js';
import { buildZones, buildPlaza, buildMedians, makeEnvMap } from './world/zones.js';
import { buildRain } from './world/rain.js';
import { Controls } from './controls.js';
import { UI, EMBLEM_SVG } from './ui.js';
import { ZONES } from './content.js';

const $ = (s) => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(location.search);
const tier = params.get('q') || (touch || Math.min(innerWidth, innerHeight) < 600 ? 'low' : 'high');
document.body.classList.toggle('is-touch', touch);
document.querySelectorAll('[data-emblem]').forEach((el) => (el.innerHTML = EMBLEM_SVG()));

const EYE = 2.0;
const WALK = 9, RUN = 17;

const loaderBar = $('#loader .bar i');
const loaderStatus = $('#loader .status');
const progress = (p, s) => {
  loaderBar.style.width = p + '%';
  if (s) loaderStatus.textContent = s;
  return new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
};

let renderer, scene, camera, composer, bloom;
let world = {};
let mode = 'intro';
let tween = null;
const player = { pos: new THREE.Vector3(0, EYE, 64), yaw: 0, pitch: 0.05, bob: 0 };
let colliders = [];
let activeZone = null;
let autoLatch = null; // prevents re-opening a zone until the visitor walks away
let paused = false;
let ui, controls;
let viewOff = 0;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  ui = new UI({
    onOpenZone: (id) => focusZone(id),
    onCloseZone: () => releaseFocus(),
    onProject: (open) => (paused = open),
    onExplore: () => startWalking(),
  });

  if (!webglOK()) {
    document.body.classList.add('no-webgl');
    $('#loader').classList.add('done');
    $('#intro').classList.add('show');
    ui.route();
    return;
  }

  await progress(4, 'Loading typefaces');
  await Promise.all([
    document.fonts.load('700 64px "Chakra Petch"'),
    document.fonts.load('500 32px "Chakra Petch"'),
  ]).catch(() => {});

  const canvas = $('#scene');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== 'low', powerPreference: 'high-performance', stencil: false });
  const maxPR = tier === 'low' ? 1.35 : 1.75;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxPR));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 2000);
  setFov();

  const rng = mulberry32(2087);
  await progress(12, 'Planning districts');
  const layout = generateLayout(rng, tier === 'low' ? 5 : 6);

  await progress(22, 'Forging the ARQEN emblem');
  const env = makeEnvMap(renderer);

  await progress(32, 'Wiring neon');
  const neon = buildNeon(rng, layout, tier);
  scene.add(neon.group);

  await progress(44, 'Raising landmarks');
  const zones = buildZones(env, neon.adAtlas, tier);
  zones.zones.forEach((z) => scene.add(z.group));
  layout.pieces.push(...zones.extraPieces);
  const plaza = buildPlaza(env);
  scene.add(plaza.group);
  const medians = buildMedians();
  scene.add(medians.group);

  await progress(56, 'Building skyline');
  scene.add(buildBuildings(layout.pieces));
  const ground = buildGround();
  scene.add(ground);
  scene.add(buildSky());
  const lampLights = [];
  scene.add(buildLamps(lampLights));

  await progress(68, 'Starting traffic');
  const traffic = new Traffic(rng, tier === 'low' ? 90 : 170);
  scene.add(traffic.mesh);
  const crowd = buildCrowd(rng, tier);
  crowd.forEach((c) => scene.add(c.mesh));
  const jellies = new Jellies(rng, tier === 'low' ? 16 : 30);
  scene.add(jellies.mesh);
  const fauna = new HoloFauna(rng, tier);
  fauna.setPixelRatio(renderer.getPixelRatio());
  scene.add(fauna.group);

  await progress(78, 'Making it rain');
  scene.add(buildRain(rng, tier === 'low' ? 2600 : 6000));

  ground.material.uniforms.uLight.value = bakeLightMap([...neon.lights, ...zones.lights, ...plaza.lights, ...lampLights]);
  colliders = [...layout.colliders, ...medians.colliders, { x: 0, z: 0, hx: 6.5, hz: 6.5 }];

  world = { zones, plaza, medians, traffic, crowd, jellies, fauna };

  if (tier !== 'low') {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.85, 0.55, 0.62);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  await progress(90, 'Compiling shaders');
  introCamera(0);
  renderer.compile(scene, camera);

  controls = new Controls(canvas, $('#joystick'));
  controls.onTap = (x, y) => pick(x, y, true);
  controls.onHover = (x, y) => pick(x, y, false);
  controls.onInteract = () => activeZone && ui.go(activeZone.id);

  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => (clock.last = performance.now()));

  await progress(100, 'Entering the city');
  setTimeout(() => $('#loader').classList.add('done'), 250);

  $('#enterBtn').addEventListener('click', () => startWalking());
  $('#introMenuBtn').addEventListener('click', () => ui.openMenu());

  if (location.hash.length > 1) {
    // Deep link: skip the intro and go straight to the requested place.
    document.body.classList.add('walking');
    mode = 'walk';
    controls.enabled = true;
    ui.route();
  } else {
    $('#intro').classList.add('show');
  }
  requestAnimationFrame(frame);
  scheduleGlitch();
}

function setFov() {
  const a = innerWidth / innerHeight;
  camera.fov = a < 0.8 ? 72 : a < 1.2 ? 66 : 60;
  camera.aspect = a;
  camera.updateProjectionMatrix();
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
  bloom?.resolution.set(innerWidth / 2, innerHeight / 2);
  setFov();
}

// ---------------------------------------------------------------------------
// Camera states
// ---------------------------------------------------------------------------
const _look = new THREE.Vector3();
function introCamera(t) {
  const a = t * 0.045 + 0.6;
  const r = innerWidth < innerHeight ? 150 : 175;
  camera.position.set(Math.cos(a) * r, 92 + Math.sin(t * 0.2) * 10, Math.sin(a) * r);
  camera.lookAt(_look.set(0, 28, 0));
}

function playerQuat(yaw = player.yaw, pitch = player.pitch) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
}

function flyTo(pos, quat, dur, arc, done) {
  tween = {
    p0: camera.position.clone(), q0: camera.quaternion.clone(),
    p1: pos.clone(), q1: quat.clone(), t: 0, dur, arc, done,
  };
  mode = 'tween';
}

function startWalking() {
  if (mode === 'walk' || mode === 'tween') return;
  $('#intro').classList.remove('show');
  document.body.classList.add('walking');
  player.pos.set(0, EYE, 64);
  player.yaw = 0;
  player.pitch = 0.12;
  flyTo(player.pos, playerQuat(), 3.4, 30, () => {
    mode = 'walk';
    controls.enabled = true;
    $('#hint').classList.add('show');
    setTimeout(() => $('#hint').classList.remove('show'), 7000);
  });
}

// Camera framing for a destination: back from the trigger, looking at the sign.
function zoneView(z) {
  const back = innerWidth < innerHeight ? 40 : 32;
  const pos = new THREE.Vector3(z.trigger.x + z.dir.x * back, 7, z.trigger.z + z.dir.y * back);
  const target = z.signPos.clone();
  target.y *= 0.82;
  const m = new THREE.Matrix4().lookAt(pos, target, new THREE.Vector3(0, 1, 0));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return { pos, q, target };
}

function focusZone(id) {
  const z = world.zones?.zones.find((x) => x.id === id);
  if (!z || !controls) return;
  $('#intro').classList.remove('show');
  document.body.classList.add('walking');
  controls.enabled = false;
  autoLatch = id;
  const v = zoneView(z);
  const dist = camera.position.distanceTo(v.pos);
  const dur = THREE.MathUtils.clamp(dist / 70, 0.9, 3.2);
  const arc = dist > 60 ? Math.min(70, dist * 0.35) : 0;
  flyTo(v.pos, v.q, dur, arc, () => (mode = 'focus'));
  // where the visitor will stand when they close the panel
  player.pos.copy(v.pos).setY(EYE);
  const dir = v.target.clone().sub(v.pos);
  player.yaw = Math.atan2(-dir.x, -dir.z);
  player.pitch = 0.12;
}

function releaseFocus() {
  if (!controls) return;
  if (mode === 'intro') return;
  flyTo(player.pos, playerQuat(), 0.8, 0, () => {
    mode = 'walk';
    controls.enabled = true;
  });
}

// ---------------------------------------------------------------------------
// Picking: signs and beacons are clickable
// ---------------------------------------------------------------------------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(x, y, click) {
  if (!world.zones || mode === 'tween') return;
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const targets = world.zones.zones.flatMap((z) => [z.sign, z.beacon2]);
  const hit = ray.intersectObjects(targets, false)[0];
  const z = hit && world.zones.zones.find((q) => q.sign === hit.object || q.beacon2 === hit.object);
  document.body.style.cursor = z ? 'pointer' : '';
  if (click && z) ui.go(z.id);
}

// ---------------------------------------------------------------------------
// Walking + collision
// ---------------------------------------------------------------------------
function collide(p) {
  const r = 0.9;
  p.x = THREE.MathUtils.clamp(p.x, -BOUND, BOUND);
  p.z = THREE.MathUtils.clamp(p.z, -BOUND, BOUND);
  for (const c of colliders) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const ox = c.hx + r - Math.abs(dx), oz = c.hz + r - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      if (ox < oz) p.x += Math.sign(dx) * ox;
      else p.z += Math.sign(dz) * oz;
    }
  }
}

function walk(dt) {
  const look = controls.consumeLook();
  const ax = controls.axes();
  player.yaw -= look.dx + ax.turn * dt * 1.8;
  player.pitch = THREE.MathUtils.clamp(player.pitch - look.dy, -0.6, 1.1);
  const speed = ax.sprint ? RUN : WALK;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const vx = (-sin * ax.f + cos * ax.r) * speed * dt;
  const vz = (-cos * ax.f - sin * ax.r) * speed * dt;
  player.pos.x += vx;
  player.pos.z += vz;
  collide(player.pos);
  const moving = Math.hypot(vx, vz) > 0.001;
  if (moving) player.bob += dt * (ax.sprint ? 13 : 9);
  player.pos.y = EYE + (moving ? Math.sin(player.bob) * 0.06 : 0);
  camera.position.copy(player.pos);
  camera.quaternion.copy(playerQuat());

  // nearest destination
  let near = null, nd = Infinity;
  for (const z of world.zones.zones) {
    const d = Math.hypot(player.pos.x - z.trigger.x, player.pos.z - z.trigger.z);
    if (d < nd) {
      nd = d;
      near = z;
    }
  }
  activeZone = nd < 22 ? near.data : null;
  ui.showPrompt(activeZone, touch);
  if (autoLatch && (!near || near.id !== autoLatch || nd > 18)) autoLatch = null;
  if (nd < 5 && autoLatch !== near.id) {
    autoLatch = near.id;
    ui.go(near.id);
  }
}

// ---------------------------------------------------------------------------
// HUD compass
// ---------------------------------------------------------------------------
const compass = $('#compass .compass__track');
compass.innerHTML = ZONES.map((z) => `<span class="cmark" data-z="${z.id}" style="--c:${z.color}">${z.num}<small>${z.short}</small></span>`).join('') +
  ['N', 'E', 'S', 'W'].map((d) => `<span class="cdir" data-d="${d}">${d}</span>`).join('');
const marks = [...compass.querySelectorAll('.cmark')];
const dirs = [...compass.querySelectorAll('.cdir')];
const DIR_ANG = { N: Math.PI, E: Math.PI / 2, S: 0, W: -Math.PI / 2 };
function updateCompass() {
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const camAng = Math.atan2(fwd.x, fwd.z);
  const w = compass.clientWidth / 2;
  const place = (el, ang) => {
    let d = ang - camAng;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const vis = Math.abs(d) < Math.PI / 2;
    el.style.opacity = vis ? 1 - Math.abs(d) / (Math.PI / 2) * 0.6 : 0;
    el.style.transform = `translateX(${(-d / (Math.PI / 2)) * w}px)`;
  };
  marks.forEach((el) => {
    const L = ZONE_LAYOUT[el.dataset.z];
    place(el, Math.atan2(L.tx - camera.position.x, L.tz - camera.position.z));
  });
  dirs.forEach((el) => place(el, DIR_ANG[el.dataset.d]));
}

// ---------------------------------------------------------------------------
// Frame loop + adaptive quality
// ---------------------------------------------------------------------------
const clock = { last: performance.now(), t: 0 };
const perf = { frames: 0, acc: 0, checks: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = Math.min(0.25, (now - clock.last) / 1000);
  const dt = Math.min(0.05, rawDt);
  clock.last = now;
  if (paused || document.hidden) return;
  clock.t += dt;
  const t = clock.t;
  U.uTime.value = t;

  if (mode === 'intro') introCamera(t);
  else if (mode === 'tween') {
    tween.t += rawDt / tween.dur;
    const k = Math.min(1, tween.t);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    camera.position.y += Math.sin(Math.PI * e) * tween.arc;
    camera.quaternion.slerpQuaternions(tween.q0, tween.q1, e);
    if (k >= 1) {
      const d = tween.done;
      tween = null;
      mode = 'idle';
      d?.();
    }
  } else if (mode === 'walk') walk(dt);
  else if (mode === 'focus') {
    // subtle drift while reading
    controls.consumeLook();
  }

  world.zones.update(t, mode === 'walk' && activeZone ? activeZone.id : ui.current);
  world.plaza.update(t);
  world.medians.update(t);
  world.traffic.update(t);
  world.crowd.forEach((c) => c.update(t));
  world.jellies.update(t);
  world.fauna.update(t);
  if (mode !== 'intro') updateCompass();

  // keep the landmark in the visible part of the screen when a side panel is open
  const wantOff = ui.current && innerWidth > 760 ? Math.min(600, innerWidth) / 2 : 0;
  viewOff += (wantOff - viewOff) * Math.min(1, dt * 4);
  if (Math.abs(viewOff) > 0.5) camera.setViewOffset(innerWidth, innerHeight, viewOff, 0, innerWidth, innerHeight);
  else if (camera.view?.enabled) camera.clearViewOffset();

  if (composer) composer.render();
  else renderer.render(scene, camera);

  adapt(dt);
}

function adapt(dt) {
  if (perf.checks > 3) return;
  perf.frames++;
  perf.acc += dt;
  if (perf.acc < 2.5) return;
  const fps = perf.frames / perf.acc;
  perf.frames = 0;
  perf.acc = 0;
  perf.checks++;
  if (fps < 38) {
    const pr = renderer.getPixelRatio();
    if (composer && pr <= 1.01) {
      composer = null; // drop bloom as a last resort
    } else if (pr > 1) {
      renderer.setPixelRatio(Math.max(1, pr - 0.35));
      composer?.setPixelRatio?.(renderer.getPixelRatio());
      world.fauna.setPixelRatio(renderer.getPixelRatio());
      onResize();
    } else if (composer) composer = null;
  }
}

function scheduleGlitch() {
  setTimeout(() => {
    const fx = $('#fx');
    fx.classList.add('glitch');
    setTimeout(() => fx.classList.remove('glitch'), 280);
    scheduleGlitch();
  }, 5000 + Math.random() * 9000);
}

boot().catch((err) => {
  console.error(err);
  $('#loader .status').textContent = 'Could not start 3D. Showing the classic view.';
  document.body.classList.add('no-webgl');
  setTimeout(() => $('#loader').classList.add('done'), 800);
  $('#intro').classList.add('show');
});
