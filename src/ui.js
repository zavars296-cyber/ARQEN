import { ZONES, PHILOSOPHY, SERVICES, PROCESS, PROJECTS, CONTACT } from './content.js';
import { ProjectViz } from './projectviz.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const EMBLEM_SVG = (cls = '') => `
<svg class="emblem ${cls}" viewBox="0 0 100 100" aria-hidden="true">
  <polygon points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5" fill="none" stroke="currentColor" stroke-width="5"/>
  <polyline points="27,74 50,27 73,74" fill="none" stroke="url(#eg)" stroke-width="9" stroke-linejoin="miter"/>
  <polygon points="50,52 57,61 50,70 43,61" fill="#29e7ff"/>
  <defs><linearGradient id="eg" x1="0" x2="1"><stop offset="0" stop-color="#29e7ff"/><stop offset="1" stop-color="#ff2fb4"/></linearGradient></defs>
</svg>`;

const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3Z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2 1.8 11.7c-1-.3-1-1 .2-1.5l18.5-7.1c.9-.3 1.6.2 1.4 1.2Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3Zm0 7.7a3 3 0 1 1 3-3 3 3 0 0 1-3 3Zm6-7.9a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1ZM21.1 8.2a5.4 5.4 0 0 0-1.5-3.8 5.4 5.4 0 0 0-3.8-1.5C14.3 2.8 9.7 2.8 8.2 2.9a5.4 5.4 0 0 0-3.8 1.5 5.4 5.4 0 0 0-1.5 3.8c-.1 1.5-.1 6.1 0 7.6a5.4 5.4 0 0 0 1.5 3.8 5.4 5.4 0 0 0 3.8 1.5c1.5.1 6.1.1 7.6 0a5.4 5.4 0 0 0 3.8-1.5 5.4 5.4 0 0 0 1.5-3.8c.1-1.5.1-6.1 0-7.6Zm-2 9.2a3.1 3.1 0 0 1-1.7 1.7c-1.2.5-4 .4-5.4.4s-4.2.1-5.4-.4a3.1 3.1 0 0 1-1.7-1.7c-.5-1.2-.4-4-.4-5.4s-.1-4.2.4-5.4a3.1 3.1 0 0 1 1.7-1.7c1.2-.5 4-.4 5.4-.4s4.2-.1 5.4.4a3.1 3.1 0 0 1 1.7 1.7c.5 1.2.4 4 .4 5.4s.1 4.2-.4 5.4Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 0 1-2.6 2.5 2.6 2.6 0 0 1 0-5.2c.3 0 .5 0 .8.1V9.6a5.7 5.7 0 1 0 4.9 5.7V9a7.3 7.3 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z"/></svg>',
};

const SOCIALS = [
  { id: 'whatsapp', label: 'WhatsApp', handle: '+380674784243', href: CONTACT.whatsapp },
  { id: 'telegram', label: 'Telegram', handle: '@zavars_2006', href: CONTACT.telegram },
  { id: 'instagram', label: 'Instagram', handle: '@arseniizavgorodnii', href: CONTACT.instagram },
  { id: 'tiktok', label: 'TikTok', handle: '@arsen4_1k', href: CONTACT.tiktok },
];

const socialLinks = (cls = '') =>
  `<div class="socials ${cls}">${SOCIALS.map(
    (s) => `<a class="social social--${s.id}" href="${s.href}" target="_blank" rel="noopener">${ICONS[s.id]}<span><b>${s.label}</b><small>${s.handle}</small></span></a>`
  ).join('')}</div>`;

// ---------------------------------------------------------------------------
// Panel content per district
// ---------------------------------------------------------------------------
function aboutHTML() {
  return `
  <p class="eyebrow">01 — The Origin</p>
  <h2 class="big">We don’t follow the future. <em>We build it.</em></h2>
  <p class="lead">ARQEN is an independent digital studio focused on creating distinctive websites, immersive digital experiences and modern visual identities.</p>
  <p>We believe a website should be more than a collection of pages. It should communicate a vision, capture attention and leave a lasting impression.</p>
  <div class="founder">
    <div class="founder__mark">${EMBLEM_SVG()}</div>
    <div>
      <p class="eyebrow">Founder &amp; Creative Director</p>
      <h3>Arsenii</h3>
      <p>Founded by Arsenii, ARQEN brings together creative thinking, modern technology and a passion for digital experimentation.</p>
    </div>
  </div>
  <h3 class="sub">Our philosophy</h3>
  <ol class="philo">${PHILOSOPHY.map((p, i) => `<li><span>0${i + 1}</span>${esc(p)}</li>`).join('')}</ol>
  <h3 class="sub">Approach to creative development</h3>
  <div class="approach">
    <div><b>Concept first</b><p>Every site starts with an idea worth remembering, not a template.</p></div>
    <div><b>Built for real devices</b><p>Immersive where it matters, fast on every phone.</p></div>
    <div><b>One studio, end to end</b><p>Direction, design and code under one roof.</p></div>
  </div>
  <p class="closing">We don’t build ordinary. <strong>We build memorable.</strong></p>
  <div class="cta-row"><button class="btn btn--primary" data-go="works">See the work</button><button class="btn" data-go="contact">Start a project</button></div>`;
}

const SERVICE_VIZ = {
  landing: '<div class="sv sv-landing"><i></i><i></i><i></i><b>CTA</b></div>',
  business: '<div class="sv sv-business"><i></i><i></i><i></i></div>',
  immersive: '<div class="sv sv-immersive"><div class="cube"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>',
  redesign: '<div class="sv sv-redesign"><div class="old"><i></i><i></i></div><div class="new"><i></i><i></i></div><span></span></div>',
  designdev: '<div class="sv sv-designdev"><span>&lt;/&gt;</span><svg viewBox="0 0 100 40"><path d="M5 30 C 25 0, 45 40, 60 15 S 90 10, 95 25"/></svg></div>',
  experiments: '<div class="sv sv-experiments"><i></i><i></i><i></i></div>',
};

function servicesHTML() {
  return `
  <p class="eyebrow">02 — What we create</p>
  <h2 class="big">Digital solutions <em>without limits.</em></h2>
  <div class="services">${SERVICES.map(
    (s) => `
    <article class="service">
      ${SERVICE_VIZ[s.viz]}
      <div class="service__body">
        <p class="num">${s.num}</p>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        <ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <button class="btn btn--small" data-go="contact" data-service="${esc(s.title)}">Discuss ${esc(s.title.toLowerCase())} →</button>
      </div>
    </article>`
  ).join('')}</div>
  <div class="note">
    <h3>Project approach</h3>
    <p>Every project is different. Pricing and delivery schedules depend on complexity, functionality and the required visual experience.</p>
    <p>Our goal is simple: deliver quality without unnecessary complications.</p>
  </div>
  <div class="cta-row"><button class="btn btn--primary" data-go="contact">Get a quote</button><button class="btn" data-go="process">How we work</button></div>`;
}

function worksHTML() {
  return `
  <p class="eyebrow">03 — Selected projects</p>
  <h2 class="big">Ideas transformed into <em>digital experiences.</em></h2>
  <p class="lead">A collection of original ARQEN concepts exploring different industries, aesthetics and technologies.</p>
  <div class="works">${PROJECTS.map(
    (p) => `
    <a class="work" href="#works/${p.id}" style="--a:${p.palette[1]};--b:${p.palette[2]}">
      <div class="work__art"><span>${p.name}</span></div>
      <div class="work__meta"><p class="num">${p.num}</p><h3>${p.name}</h3><p class="cat">${esc(p.category)}</p><p>${esc(p.summary)}</p><span class="more">Open project →</span></div>
    </a>`
  ).join('')}</div>
  <p class="disclaimer">These are self-initiated ARQEN concept projects, not commissioned client work.</p>`;
}

function processHTML() {
  return `
  <p class="eyebrow">04 — How we work</p>
  <h2 class="big">From an idea to a <em>digital experience.</em></h2>
  <div class="flow">${PROCESS.map((p) => `<span>${p.title}</span>`).join('<i>→</i>')}</div>
  <ol class="steps">${PROCESS.map(
    (p) => `<li><div class="step__num">${p.num}</div><div><h3>${p.title}</h3><p>${esc(p.text)}</p></div></li>`
  ).join('')}</ol>
  <p class="closing">Clear communication. Thoughtful execution. <strong>No unnecessary complexity.</strong></p>
  <div class="cta-row"><button class="btn btn--primary" data-go="contact">Start with Discover</button></div>`;
}

function contactHTML() {
  return `
  <p class="eyebrow">05 — Enter the next dimension</p>
  <h2 class="big">Have an idea? <em>Let’s make it real.</em></h2>
  <p class="lead">Every great digital experience begins with a conversation.</p>
  <div class="founder founder--small">
    <div class="founder__mark">${EMBLEM_SVG()}</div>
    <div><p class="eyebrow">Founder &amp; Creative Director</p><h3>Arsenii — ARQEN</h3></div>
  </div>
  <h3 class="sub">Direct contact</h3>
  ${socialLinks()}
  <h3 class="sub">Project inquiry</h3>
  <form class="inquiry" novalidate>
    <label><span>Your name</span><input name="name" autocomplete="name" required maxlength="80" placeholder="Name"></label>
    <label><span>Company or website (optional)</span><input name="company" maxlength="120" placeholder="Company / link"></label>
    <label><span>What do you need?</span>
      <select name="service">${SERVICES.map((s) => `<option>${esc(s.title)}</option>`).join('')}<option>Not sure yet</option></select>
    </label>
    <label><span>Tell us about the project</span><textarea name="message" rows="4" required maxlength="1500" placeholder="Goals, timeline, references…"></textarea></label>
    <p class="form-note">The form doesn’t store anything. It prepares your message and opens a chat with Arsenii, so you get a personal reply.</p>
    <div class="form-actions">
      <button class="btn btn--primary" type="submit" data-via="whatsapp">${ICONS.whatsapp} Send via WhatsApp</button>
      <button class="btn" type="submit" data-via="telegram">${ICONS.telegram} Send via Telegram</button>
    </div>
    <p class="form-status" role="status" aria-live="polite"></p>
  </form>
  <div class="final">
    <p>Your vision deserves more than an ordinary website.</p>
    <p><strong>Let’s build something extraordinary.</strong></p>
    <p class="sig">ARQEN — BUILD BEYOND REALITY.</p>
  </div>`;
}

const RENDER = { about: aboutHTML, services: servicesHTML, works: worksHTML, process: processHTML, contact: contactHTML };

// ---------------------------------------------------------------------------
// Project pages
// ---------------------------------------------------------------------------
function projectHTML(p) {
  const i = PROJECTS.indexOf(p);
  const prev = PROJECTS[(i + PROJECTS.length - 1) % PROJECTS.length];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  return `
  <div class="project__hero">
    <canvas class="project__canvas"></canvas>
    <div class="project__heroText">
      <p class="eyebrow">ARQEN concept ${p.num} / 06 · Self-initiated</p>
      <h1 class="project__title" data-text="${p.name}">${p.name}</h1>
      <p class="cat">${esc(p.category)}</p>
    </div>
    <div class="scroll-hint">Scroll</div>
  </div>
  <div class="project__body">
    <div class="concept-badge">Concept project — designed by ARQEN to explore an idea. Not a commissioned client work.</div>
    <section class="pgrid">
      <div><p class="eyebrow">Overview</p><p class="lead">${esc(p.summary)}</p><p>${esc(p.overview)}</p></div>
      <div><p class="eyebrow">Project objectives</p><ol class="objectives">${p.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ol></div>
    </section>
    <section>
      <p class="eyebrow">Visual identity</p>
      <div class="swatches">${p.palette.map((c, k) => `<div class="swatch" style="--c:${c}"><i></i><b>${esc(p.paletteNames[k])}</b><small>${c.toUpperCase()}</small></div>`).join('')}</div>
      <p class="typeline">${esc(p.type)}</p>
      <div class="wordmark" style="--a:${p.palette[1]};--b:${p.palette[2]}">${p.name}</div>
    </section>
    <section>
      <p class="eyebrow">Key features</p>
      <div class="features">${p.features.map((f, k) => `<div class="feature"><span>0${k + 1}</span>${esc(f)}</div>`).join('')}</div>
    </section>
    <section class="project__cta">
      <h2>Want something like ${p.name} for your brand?</h2>
      <button class="btn btn--primary" data-go="contact" data-service="Immersive Experiences">Start a project</button>
    </section>
    <nav class="project__nav">
      <a href="#works/${prev.id}">← ${prev.name}</a>
      <a href="#works">All works</a>
      <a href="#works/${next.id}">${next.name} →</a>
    </nav>
  </div>`;
}

// ---------------------------------------------------------------------------
// UI controller
// ---------------------------------------------------------------------------
export class UI {
  constructor(hooks) {
    this.hooks = hooks;
    this.panel = $('#panel');
    this.panelBody = $('#panel .panel__body');
    this.project = $('#project');
    this.menu = $('#menu');
    this.prompt = $('#prompt');
    this.current = null;
    this.viz = null;
    this.buildMenu();
    this.bind();
  }

  buildMenu() {
    $('#menu .menu__list').innerHTML = ZONES.map(
      (z) => `<button class="menu__item" data-nav="${z.id}" style="--c:${z.color}"><span class="num">${z.num}</span><span class="name">${z.name}</span><span class="kick">${z.kicker}</span></button>`
    ).join('');
    $('#menu .menu__socials').innerHTML = socialLinks('socials--compact');
  }

  bind() {
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (go) {
        e.preventDefault();
        if (go.dataset.service) this.pendingService = go.dataset.service;
        this.go(go.dataset.go);
        return;
      }
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        e.preventDefault();
        this.closeMenu();
        this.go(nav.dataset.nav);
      }
    });
    $('#panel .panel__close').addEventListener('click', () => this.close());
    $('#project .project__close').addEventListener('click', () => this.go('works'));
    $('#menuBtn').addEventListener('click', () => this.toggleMenu());
    $('#menu .menu__close').addEventListener('click', () => this.closeMenu());
    $('#menu [data-explore]').addEventListener('click', () => { this.closeMenu(); this.close(); this.hooks.onExplore?.(); });
    $('#contactBtn').addEventListener('click', () => this.go('contact'));
    window.addEventListener('hashchange', () => this.route());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.menu.classList.contains('open')) this.closeMenu();
        else if (this.current) this.close();
      }
    });
    document.addEventListener('submit', (e) => {
      if (!e.target.matches('.inquiry')) return;
      e.preventDefault();
      this.sendInquiry(e.target, e.submitter?.dataset.via || 'whatsapp');
    });
  }

  go(id) {
    const target = '#' + id;
    if (location.hash === target) this.route();
    else location.hash = target;
  }

  route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const [zone, sub] = h.split('/');
    if (zone === 'works' && sub && ZONE_IDS.has('works')) {
      const p = PROJECTS.find((x) => x.id === sub);
      if (p) return this.showProject(p);
    }
    this.hideProject();
    if (ZONE_IDS.has(zone)) this.showPanel(zone);
    else this.hidePanel();
  }

  showPanel(id) {
    const z = ZONES.find((x) => x.id === id);
    if (this.current !== id) {
      this.panelBody.innerHTML = RENDER[id]();
      this.panelBody.scrollTop = 0;
      this.panel.style.setProperty('--zc', z.color);
      this.panel.style.setProperty('--zc2', z.color2);
      $('#panel .panel__num').textContent = z.num;
      $('#panel .panel__name').textContent = z.name;
    }
    if (id === 'contact' && this.pendingService) {
      const sel = $('select[name="service"]', this.panel);
      if (sel) sel.value = this.pendingService;
      this.pendingService = null;
    }
    this.current = id;
    this.panel.classList.add('open');
    this.panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panel-open');
    this.showPrompt(null);
    this.hooks.onOpenZone?.(id);
  }

  hidePanel() {
    if (!this.current) return;
    this.current = null;
    this.panel.classList.remove('open');
    this.panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('panel-open');
    this.hooks.onCloseZone?.();
  }

  close() {
    history.replaceState(null, '', location.pathname + location.search);
    this.hideProject();
    this.hidePanel();
  }

  showProject(p) {
    this.hidePanelSilently();
    this.project.innerHTML = `<button class="project__close" aria-label="Back to works">← Works</button>` + projectHTML(p);
    $('.project__close', this.project).addEventListener('click', () => this.go('works'));
    this.project.style.setProperty('--a', p.palette[1]);
    this.project.style.setProperty('--b', p.palette[2]);
    this.project.classList.add('open');
    this.project.scrollTop = 0;
    document.body.classList.add('project-open');
    this.viz?.dispose();
    try {
      this.viz = new ProjectViz($('.project__canvas', this.project), p.viz);
    } catch (err) {
      console.warn('Project visual unavailable', err);
    }
    this.hooks.onProject?.(true);
  }

  hidePanelSilently() {
    if (!this.current) return;
    this.current = null;
    this.panel.classList.remove('open');
    document.body.classList.remove('panel-open');
  }

  hideProject() {
    if (!this.project.classList.contains('open')) return;
    this.viz?.dispose();
    this.viz = null;
    this.project.classList.remove('open');
    document.body.classList.remove('project-open');
    this.hooks.onProject?.(false);
  }

  toggleMenu() {
    this.menu.classList.contains('open') ? this.closeMenu() : this.openMenu();
  }
  openMenu() {
    this.menu.classList.add('open');
    document.body.classList.add('menu-open');
  }
  closeMenu() {
    this.menu.classList.remove('open');
    document.body.classList.remove('menu-open');
  }

  showPrompt(zone, touch) {
    if (!zone) {
      this.prompt.classList.remove('show');
      this.promptZone = null;
      return;
    }
    if (this.promptZone === zone.id) return;
    this.promptZone = zone.id;
    this.prompt.style.setProperty('--zc', zone.color);
    this.prompt.innerHTML = `<span class="prompt__key">${touch ? 'TAP' : 'E'}</span><span><small>${zone.num} — ${zone.name}</small><b>Enter ${zone.short}</b></span>`;
    this.prompt.onclick = () => this.go(zone.id);
    this.prompt.classList.add('show');
  }

  sendInquiry(form, via) {
    const status = $('.form-status', form);
    const d = Object.fromEntries(new FormData(form));
    if (!d.name.trim() || !d.message.trim()) {
      status.textContent = 'Please add your name and a few words about the project.';
      status.className = 'form-status err';
      return;
    }
    const text = [
      `Hi Arsenii! New project inquiry from the ARQEN website.`,
      `Name: ${d.name.trim()}`,
      d.company.trim() ? `Company: ${d.company.trim()}` : null,
      `Service: ${d.service}`,
      `Project: ${d.message.trim()}`,
    ].filter(Boolean).join('\n');
    if (via === 'whatsapp') {
      window.open(`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      status.textContent = 'WhatsApp is opening with your message ready. Just press send.';
      status.className = 'form-status ok';
    } else {
      const done = () => {
        status.textContent = 'Message copied. Telegram is opening: paste it into the chat and send.';
        status.className = 'form-status ok';
      };
      const w = window.open(CONTACT.telegram, '_blank', 'noopener');
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text) && done());
      else if (fallbackCopy(text)) done();
      if (!w) location.href = CONTACT.telegram;
    }
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {}
  ta.remove();
  return ok;
}

const ZONE_IDS = new Set(ZONES.map((z) => z.id));
