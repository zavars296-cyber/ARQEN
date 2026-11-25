import * as THREE from 'three';

// Procedural canvas textures: neon sign atlases, advert atlas, zone signs.
// Everything is drawn at runtime so the site ships with zero image files.

export const PALETTE = {
  crimson: '#ff2d55',
  pink: '#ff2fb4',
  violet: '#a64dff',
  blue: '#3d6bff',
  cyan: '#29e7ff',
  acid: '#9dff3a',
  yellow: '#ffe14d',
  orange: '#ff8a3d',
  white: '#eaf6ff',
};
export const NEON = [
  PALETTE.crimson,
  PALETTE.pink,
  PALETTE.violet,
  PALETTE.blue,
  PALETTE.cyan,
  PALETTE.acid,
  PALETTE.yellow,
  PALETTE.cyan,
  PALETTE.pink,
];

const H_TEXTS = [
  'NOODLE 24/7', 'HYPERION', 'NEON LOTUS', 'SYNTH BAR', 'KAIJU RAMEN', 'VOLT',
  'HOTEL ORBIT', 'DATA DEN', 'CYBERCARE', 'PIXEL CAFE', 'NOVA', 'ZERO G',
  'ARCADE', 'BIOLAB', 'MEMORY SHOP', 'CHROME', 'NIGHT MARKET', 'GRID',
  'ECHO', 'LUMA', 'OVERDRIVE', 'IMPLANTS', 'SECTOR 9', 'OPEN',
  'ARQEN', 'DREAM PODS', 'SOFT WIRE', 'RAIN CLUB', 'LIQUID', 'MOTO', 'BYTE', 'HALO',
];
const V_TEXTS = [
  'HOTEL', 'BAR', 'RAMEN', 'ARCADE', 'CLINIC', 'NEON', 'SUSHI', 'DRONES',
  'CYBER', 'MOTEL', 'KARAOKE', 'TATTOO', 'VAPOR', 'DREAMS', 'CLUB', 'STORE',
  'ARQEN', 'OPEN', 'TECH', 'ROBOT', 'NOIR', 'BEYOND', 'LOFT', 'PULSE',
  'MEDIC', 'CHIPS', 'GAMES', 'LOVE', 'NOODLE', 'SYNTH', 'VIBE', 'NIGHT',
];

export const FONT = '"Chakra Petch", "Arial Narrow", sans-serif';

function glowText(ctx, text, x, y, color, size, opts = {}) {
  ctx.font = `${opts.weight || 700} ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.45;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = size * 0.15;
  ctx.fillStyle = mixWhite(color, 0.55);
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

export function mixWhite(hex, t) {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), t);
  return '#' + c.getHexString();
}

function fitSize(ctx, text, maxW, size, weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  return w > maxW ? Math.floor((size * maxW) / w) : size;
}

function frame(ctx, x, y, w, h, color, style) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  if (style === 0) {
    ctx.strokeRect(x, y, w, h);
  } else if (style === 1) {
    const c = 16;
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + c);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.5);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w * 0.3, y);
    ctx.moveTo(x + w, y + h * 0.5);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w * 0.7, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

function makeTexture(canvas, { mips = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = mips;
  tex.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  return tex;
}

// Horizontal signs: 4 cols x 8 rows of 512x128.
export function makeHorizontalSignAtlas(rng) {
  const cw = 512, ch = 128, cols = 4, rows = 8;
  const c = document.createElement('canvas');
  c.width = cw * cols;
  c.height = ch * rows;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  const colors = [];
  H_TEXTS.forEach((t, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    const col = NEON[Math.floor(rng() * NEON.length)];
    colors.push(col);
    frame(ctx, x + 10, y + 12, cw - 20, ch - 24, col, i % 3);
    const size = fitSize(ctx, t, cw - 70, 76);
    glowText(ctx, t, x + cw / 2, y + ch / 2 + 3, col, size);
  });
  return { texture: makeTexture(c), cols, rows, count: H_TEXTS.length, colors };
}

// Vertical signs: 16 cols x 2 rows of 128x512.
export function makeVerticalSignAtlas(rng) {
  const cw = 128, ch = 512, cols = 16, rows = 2;
  const c = document.createElement('canvas');
  c.width = cw * cols;
  c.height = ch * rows;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  const colors = [];
  V_TEXTS.forEach((t, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    const col = NEON[Math.floor(rng() * NEON.length)];
    colors.push(col);
    frame(ctx, x + 10, y + 10, cw - 20, ch - 20, col, 0);
    const letters = t.split('');
    const step = Math.min(70, (ch - 60) / letters.length);
    const size = Math.min(64, step * 1.05);
    const startY = y + ch / 2 - (step * (letters.length - 1)) / 2;
    letters.forEach((L, k) => glowText(ctx, L, x + cw / 2, startY + k * step, col, size));
  });
  return { texture: makeTexture(c), cols, rows, count: V_TEXTS.length, colors };
}

// Adverts: 4x4 cells of 512x512 drawn as poster artwork.
const ADS = [
  { t: 'ARQEN', s: 'BUILD BEYOND REALITY', a: '#29e7ff', b: '#a64dff', k: 'emblem' },
  { t: 'VELOCITY', s: 'FEEL THE LAUNCH', a: '#ff2d55', b: '#ff8a3d', k: 'speed' },
  { t: 'NEXORA', s: 'MONEY IN MOTION', a: '#3d6bff', b: '#29e7ff', k: 'rings' },
  { t: 'VANTA', s: 'ABSOLUTE BLACK', a: '#b48cff', b: '#e8e3da', k: 'silk' },
  { t: 'MONOLITH', s: 'SPACE • LIGHT • FORM', a: '#ffb347', b: '#d9d4cc', k: 'blocks' },
  { t: 'SYNTRA', s: 'INTELLIGENCE, VISIBLE', a: '#9dff3a', b: '#29e7ff', k: 'nodes' },
  { t: 'AFTERDARK', s: 'THE NIGHT IS LIVE', a: '#ff2fb4', b: '#ffe14d', k: 'tunnel' },
  { t: 'KUROSHI', s: 'NOODLES • 24H', a: '#ffe14d', b: '#ff2d55', k: 'sun' },
  { t: 'DREAM PODS', s: 'SLEEP IN THE CLOUD', a: '#a64dff', b: '#29e7ff', k: 'rings' },
  { t: 'ZER0', s: 'ZERO-G ENERGY DRINK', a: '#9dff3a', b: '#ffe14d', k: 'speed' },
  { t: 'ARQEN', s: 'DIGITAL STUDIO', a: '#ff2fb4', b: '#29e7ff', k: 'emblem' },
  { t: 'HALO', s: 'AUGMENT YOUR SIGHT', a: '#29e7ff', b: '#eaf6ff', k: 'eye' },
  { t: 'RAIN CLUB', s: 'LIVE TONIGHT', a: '#ff2fb4', b: '#a64dff', k: 'tunnel' },
  { t: 'ORBITAL', s: 'TRAVEL • MOON • MARS', a: '#ff8a3d', b: '#3d6bff', k: 'sun' },
  { t: 'ARQEN', s: 'INFINITE POSSIBILITIES', a: '#9dff3a', b: '#29e7ff', k: 'emblem' },
  { t: 'CHROME', s: 'BODY UPGRADES', a: '#eaf6ff', b: '#ff2d55', k: 'eye' },
];

export function drawEmblem(ctx, cx, cy, r, color, lw = 6) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'miter';
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.25;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = lw * 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy + r * 0.5);
  ctx.lineTo(cx, cy - r * 0.48);
  ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.02);
  ctx.lineTo(cx + r * 0.14, cy + r * 0.2);
  ctx.lineTo(cx, cy + r * 0.38);
  ctx.lineTo(cx - r * 0.14, cy + r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function adArt(ctx, kind, x, y, w, h, a, b, rng) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#05020c');
  g.addColorStop(1, mixDark(b, 0.8));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.shadowColor = a;
  ctx.shadowBlur = 20;
  ctx.lineWidth = 4;
  const cx = x + w / 2, cy = y + h * 0.42;
  if (kind === 'emblem') {
    drawEmblem(ctx, cx, cy, w * 0.24, a, 6);
  } else if (kind === 'speed') {
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = i % 2 ? a : b;
      const yy = y + rng() * h * 0.75;
      const len = 60 + rng() * 260;
      const xx = x + rng() * w;
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx + len, yy - len * 0.12);
      ctx.stroke();
    }
  } else if (kind === 'rings') {
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = i % 2 ? a : b;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 40 + i * 26, 16 + i * 10, -0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'silk') {
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = i % 3 ? mixDark(a, 0.3) : b;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const px = x + (k / 40) * w;
        const py = y + 60 + i * 16 + Math.sin(k * 0.25 + i * 0.4) * 30;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  } else if (kind === 'blocks') {
    for (let i = 0; i < 7; i++) {
      const bw = 30 + rng() * 60, bh = 60 + rng() * 170;
      const bx = x + 40 + i * 62;
      ctx.fillStyle = i % 2 ? mixDark(b, 0.5) : mixDark(b, 0.7);
      ctx.fillRect(bx, y + h * 0.7 - bh, bw, bh);
      ctx.fillStyle = a;
      ctx.fillRect(bx, y + h * 0.7 - bh, 4, bh);
    }
  } else if (kind === 'nodes') {
    const pts = [];
    for (let i = 0; i < 22; i++) pts.push([x + 40 + rng() * (w - 80), y + 40 + rng() * h * 0.6]);
    ctx.strokeStyle = mixDark(b, 0.3);
    ctx.lineWidth = 2;
    pts.forEach((p, i) => {
      const q = pts[(i * 7 + 3) % pts.length];
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.stroke();
    });
    ctx.fillStyle = a;
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (kind === 'tunnel') {
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = i % 2 ? a : b;
      const s = 20 + i * i * 6;
      ctx.strokeRect(cx - s, cy - s * 0.7, s * 2, s * 1.4);
    }
  } else if (kind === 'sun') {
    const sg = ctx.createLinearGradient(0, cy - 120, 0, cy + 120);
    sg.addColorStop(0, a);
    sg.addColorStop(1, b);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05020c';
    for (let i = 0; i < 7; i++) ctx.fillRect(x, cy + 10 + i * 16, w, 3 + i * 1.5);
  } else if (kind === 'eye') {
    ctx.strokeStyle = a;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 150, 70, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05020c';
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function mixDark(hex, t) {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#000000'), t);
  return '#' + c.getHexString();
}

export function makeAdAtlas(rng) {
  const cs = 512, cols = 4;
  const c = document.createElement('canvas');
  c.width = cs * cols;
  c.height = cs * cols;
  const ctx = c.getContext('2d');
  ADS.forEach((ad, i) => {
    const x = (i % cols) * cs, y = Math.floor(i / cols) * cs;
    adArt(ctx, ad.k, x, y, cs, cs, ad.a, ad.b, rng);
    const size = fitSize(ctx, ad.t, cs - 60, 96);
    glowText(ctx, ad.t, x + cs / 2, y + cs * 0.8, ad.a, size);
    ctx.font = `600 30px ${FONT}`;
    ctx.fillStyle = mixWhite(ad.b, 0.4);
    ctx.textAlign = 'center';
    ctx.fillText(ad.s, x + cs / 2, y + cs * 0.92);
  });
  return { texture: makeTexture(c), cols, count: ADS.length, colors: ADS.map((a) => a.a) };
}

// Big individual sign for a zone landmark.
export function makeZoneSign(zone) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(4,2,12,0.82)';
  ctx.fillRect(0, 0, c.width, c.height);
  frame(ctx, 14, 14, 996, 356, zone.color, 1);
  ctx.fillStyle = zone.color;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(14, 14, 996, 70);
  ctx.globalAlpha = 1;
  ctx.font = `600 40px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = mixWhite(zone.color2, 0.3);
  ctx.fillText(`${zone.num} — ${zone.name}`, 46, 50);
  const size = fitSize(ctx, zone.sign, 900, 170);
  glowText(ctx, zone.sign, 512, 220, zone.color, size);
  ctx.font = `500 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = mixWhite(zone.color, 0.5);
  ctx.fillText('APPROACH OR TAP TO ENTER', 512, 330);
  return makeTexture(c);
}

// Soft radial gradient used for glow sprites and light pools.
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return makeTexture(c);
}
