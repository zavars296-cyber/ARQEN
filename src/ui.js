import { NAV, PHILOSOPHY, SERVICES, PROCESS, PROJECTS, CONTACT } from './content.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const EMBLEM_SVG = `
<svg class="emblem" viewBox="0 0 100 100" aria-hidden="true">
  <defs><linearGradient id="eg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#9fb2ff"/><stop offset="1" stop-color="#8a5cff"/></linearGradient></defs>
  <polygon points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5" fill="none" stroke="url(#eg)" stroke-width="5"/>
  <polyline points="27,74 50,27 73,74" fill="none" stroke="#f3f5ff" stroke-width="9" stroke-linejoin="miter"/>
  <polygon points="50,52 57,61 50,70 43,61" fill="#5be4ff"/>
</svg>`;

const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3Z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2 1.8 11.7c-1-.3-1-1 .2-1.5l18.5-7.1c.9-.3 1.6.2 1.4 1.2Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3Zm0 7.7a3 3 0 1 1 3-3 3 3 0 0 1-3 3Zm6-7.9a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1ZM21.1 8.2a5.4 5.4 0 0 0-1.5-3.8 5.4 5.4 0 0 0-3.8-1.5C14.3 2.8 9.7 2.8 8.2 2.9a5.4 5.4 0 0 0-3.8 1.5 5.4 5.4 0 0 0-1.5 3.8c-.1 1.5-.1 6.1 0 7.6a5.4 5.4 0 0 0 1.5 3.8 5.4 5.4 0 0 0 3.8 1.5c1.5.1 6.1.1 7.6 0a5.4 5.4 0 0 0 3.8-1.5 5.4 5.4 0 0 0 1.5-3.8c.1-1.5.1-6.1 0-7.6Zm-2 9.2a3.1 3.1 0 0 1-1.7 1.7c-1.2.5-4 .4-5.4.4s-4.2.1-5.4-.4a3.1 3.1 0 0 1-1.7-1.7c-.5-1.2-.4-4-.4-5.4s-.1-4.2.4-5.4a3.1 3.1 0 0 1 1.7-1.7c1.2-.5 4-.4 5.4-.4s4.2-.1 5.4.4a3.1 3.1 0 0 1 1.7 1.7c.5 1.2.4 4 .4 5.4s.1 4.2-.4 5.4Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 0 1-2.6 2.5 2.6 2.6 0 0 1 0-5.2c.3 0 .5 0 .8.1V9.6a5.7 5.7 0 1 0 4.9 5.7V9a7.3 7.3 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z"/></svg>',
};

const SOCIALS = [
  { id: 'whatsapp', label: 'WhatsApp', handle: '+380 67 478 4243', href: CONTACT.whatsapp },
  { id: 'telegram', label: 'Telegram', handle: '@zavars_2006', href: CONTACT.telegram },
  { id: 'instagram', label: 'Instagram', handle: '@arseniizavgorodnii', href: CONTACT.instagram },
  { id: 'tiktok', label: 'TikTok', handle: '@arsen4_1k', href: CONTACT.tiktok },
];
const socialHTML = () => SOCIALS.map((s) => `<a class="social" href="${s.href}" target="_blank" rel="noopener" data-hover>${ICONS[s.id]}<span><b>${s.label}</b><small>${s.handle}</small></span><i>↗</i></a>`).join('');

export function renderSite() {
  $$('[data-emblem]').forEach((el) => (el.innerHTML = EMBLEM_SVG));
  const navHTML = NAV.map((n) => `<a href="#${n.id}" data-nav="${n.id}">${n.label}</a>`).join('');
  $('.nav__links').innerHTML = navHTML;
  $('.mobile-menu nav').innerHTML = NAV.map((n, i) => `<a href="#${n.id}"><small>0${i + 1}</small>${n.label}</a>`).join('');
  $('.footer__links').innerHTML = navHTML;
  $('.mobile-menu__socials').innerHTML = socialHTML();
  $('.socials').innerHTML = socialHTML();
  $('[data-year]').textContent = new Date().getFullYear();

  const words = ['Websites', 'UI/UX', 'Automation', 'Digital Experiences', 'AI Solutions', 'Build beyond reality'];
  const run = words.map((w) => `<span>${w}</span><i>✦</i>`).join('');
  $('.marquee__track').innerHTML = run + run + run;

  $('.principles').innerHTML = PHILOSOPHY.map((p, i) => `<li class="reveal"><span>0${i + 1}</span>${esc(p)}</li>`).join('');

  $('.cards').innerHTML = SERVICES.map((s) => `
    <article class="card reveal" data-card data-tilt>
      <div class="card__view" data-view="${s.view}"></div>
      <div class="card__glare"></div>
      <div class="card__body">
        <div class="card__top"><span class="label">${s.num}</span><span class="card__plus">+</span></div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        <ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <a class="card__cta" href="#contact" data-service="${esc(s.title)}">Discuss a project <span class="arrow">→</span></a>
      </div>
    </article>`).join('');

  $('.projects').innerHTML = PROJECTS.map((p, i) => `
    <a class="proj reveal ${i % 3 === 0 ? 'proj--wide' : ''}" href="#work/${p.id}" data-card data-tilt style="--a:${p.palette[1]};--b:${p.palette[2]}">
      <div class="mock">
        <div class="mock__bar"><i></i><i></i><i></i><span>${p.id}.arqen.concept</span></div>
        <div class="mock__screen" data-view="work-${p.id}">
          <div class="mock__overlay"><span class="mock__name">${p.name}</span></div>
        </div>
      </div>
      <div class="proj__meta">
        <span class="label">${p.num} · Concept</span>
        <h3>${p.name}</h3>
        <p class="proj__cat">${esc(p.category)}</p>
        <p>${esc(p.summary)}</p>
        <span class="proj__more">View concept <span class="arrow">→</span></span>
      </div>
    </a>`).join('');

  $('.steps').insertAdjacentHTML('beforeend', PROCESS.map((p) => `
    <div class="step reveal">
      <div class="step__dot"><span>${p.num}</span></div>
      <h3>${p.title}</h3>
      <p>${esc(p.text)}</p>
    </div>`).join(''));

  $('.form select').innerHTML = SERVICES.map((s) => `<option>${esc(s.title)}</option>`).join('') + '<option>Not sure yet</option>';
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------
export function bindInteractions() {
  // reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  // active nav link
  const sections = $$('[data-section]');
  const navIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    let id = e.target.id;
    if (id === 'approach') id = 'work';
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navIO.observe(s));

  // header state
  const nav = $('.nav');
  const onScroll = () => {
    nav.classList.toggle('scrolled', scrollY > 40);
    // approach progress line
    const steps = $('.steps');
    const r = steps.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / (r.height + innerHeight * 0.25)));
    steps.style.setProperty('--p', p.toFixed(3));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // mobile menu
  const burger = $('.nav__burger');
  const menu = $('.mobile-menu');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  menu.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));

  // service CTA prefills the form
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-service]');
    if (a) $('.form select').value = a.dataset.service;
  });

  // tilt cards
  if (matchMedia('(hover: hover)').matches) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
        const v = card.querySelector('[data-view]');
        if (v) { v.dataset.px = x.toFixed(3); v.dataset.py = y.toFixed(3); }
      });
      card.addEventListener('pointerleave', () => {
        const v = card.querySelector('[data-view]');
        if (v) v.dataset.px = v.dataset.py = 0;
      });
    });
    setupCursor();
  }

  // form
  $('.form').addEventListener('submit', (e) => {
    e.preventDefault();
    sendInquiry(e.target, e.submitter?.dataset.via || 'whatsapp');
  });
}

function setupCursor() {
  const c = $('.cursor');
  document.body.classList.add('has-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX;
    y = e.clientY;
    c.style.setProperty('--x', x + 'px');
    c.style.setProperty('--y', y + 'px');
    const hov = e.target.closest('a, button, [data-hover], input, textarea, select, label');
    c.classList.toggle('hover', !!hov);
  });
  document.addEventListener('mouseleave', () => c.classList.add('gone'));
  document.addEventListener('mouseenter', () => c.classList.remove('gone'));
  const tick = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    c.style.setProperty('--rx', rx + 'px');
    c.style.setProperty('--ry', ry + 'px');
    requestAnimationFrame(tick);
  };
  tick();
}

function sendInquiry(form, via) {
  const status = $('.form__status', form);
  const d = Object.fromEntries(new FormData(form));
  if (!d.name.trim() || !d.message.trim()) {
    status.textContent = 'Please add your name and a few words about the project.';
    status.className = 'form__status err';
    return;
  }
  const text = [
    'Hi Arsenii! New project inquiry from the ARQEN website.',
    `Name: ${d.name.trim()}`,
    d.company.trim() ? `Company: ${d.company.trim()}` : null,
    `Service: ${d.service}`,
    `Project: ${d.message.trim()}`,
  ].filter(Boolean).join('\n');
  if (via === 'whatsapp') {
    window.open(`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    status.textContent = 'WhatsApp is opening with your message ready. Just press send.';
    status.className = 'form__status ok';
    return;
  }
  const done = () => {
    status.textContent = 'Message copied. Telegram is opening: paste it into the chat and send.';
    status.className = 'form__status ok';
  };
  const copy = navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : Promise.reject();
  copy.then(done, () => (fallbackCopy(text) ? done() : (status.textContent = 'Telegram is opening. Please describe your project in the chat.')));
  window.open(CONTACT.telegram, '_blank', 'noopener');
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  ta.remove();
  return ok;
}

// ---------------------------------------------------------------------------
// Concept project pages (#work/<id>)
// ---------------------------------------------------------------------------
export function projectHTML(p) {
  const i = PROJECTS.indexOf(p);
  const prev = PROJECTS[(i + PROJECTS.length - 1) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  return `
  <button class="project__close btn btn--ghost" data-close>← Back</button>
  <div class="project__hero">
    <canvas class="project__canvas"></canvas>
    <div class="project__heroText">
      <p class="label">ARQEN concept ${p.num} / 06 · Self-initiated</p>
      <h1 class="project__title">${p.name}</h1>
      <p class="project__cat">${esc(p.category)}</p>
    </div>
  </div>
  <div class="project__body wrap">
    <p class="badge">Concept project: designed by ARQEN to explore an idea. Not commissioned client work.</p>
    <section class="pgrid">
      <div><p class="label label--accent">Overview</p><p class="lead">${esc(p.summary)}</p><p>${esc(p.overview)}</p></div>
      <div><p class="label label--accent">Objectives</p><ol class="objectives">${p.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ol></div>
    </section>
    <section>
      <p class="label label--accent">Visual identity</p>
      <div class="swatches">${p.palette.map((c, k) => `<div class="swatch" style="--c:${c}"><i></i><b>${esc(p.paletteNames[k])}</b><small>${c.toUpperCase()}</small></div>`).join('')}</div>
      <p class="typeline">${esc(p.type)}</p>
      <div class="wordmark">${p.name}</div>
    </section>
    <section>
      <p class="label label--accent">Key features</p>
      <div class="features">${p.features.map((f, k) => `<div class="feature"><span>0${k + 1}</span>${esc(f)}</div>`).join('')}</div>
    </section>
    <section class="project__cta">
      <h2>Want something like ${p.name} for your brand?</h2>
      <a class="btn btn--primary" href="#contact" data-service="Digital Experiences">Let’s talk <span class="arrow">→</span></a>
    </section>
    <nav class="project__nav">
      <a href="#work/${prev.id}">← ${prev.name}</a>
      <a href="#work">All work</a>
      <a href="#work/${next.id}">${next.name} →</a>
    </nav>
  </div>`;
}
