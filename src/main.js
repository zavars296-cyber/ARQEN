import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/500.css';
import './style.css';

import { renderSite, bindInteractions, projectHTML } from './ui.js';
import { PROJECTS } from './content.js';

const $ = (s) => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;
const quality = new URLSearchParams(location.search).get('q') || (touch || innerWidth < 760 ? 'low' : 'high');
document.body.classList.toggle('is-touch', touch);

renderSite();
bindInteractions();

let stage = null;
let viz = null;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// 3D is loaded after the page is already readable: no loading screen.
if (webglOK()) {
  import('./three/stage.js').then(({ Stage }) => {
    stage = new Stage($('#gl'), quality);
    const k = (id, o) => ({ el: document.getElementById(id), x: 0, y: 0, z: 0, s: 1, ry: 0, dim: 0, ...o });
    stage.setKeyframes([
      k('home', { x: 2.7, y: 0.25, ry: -0.35 }),
      k('about', { x: -3.1, y: -0.1, z: -0.6, s: 0.78, ry: 0.5, dim: 0.2 }),
      k('services', { x: 0, y: 1.2, z: -7, s: 0.7, ry: 1.4, dim: 1 }),
      k('work', { x: 2.5, y: -0.6, z: -8, s: 0.7, ry: 2.6, dim: 1 }),
      k('approach', { x: 3.4, y: 1.3, z: -6, s: 0.8, ry: 3.4, dim: 0.85 }),
      k('contact', { x: 2.7, y: 0.3, z: -3, s: 0.85, ry: 6.28, dim: 0.45 }),
    ]);
    if (viz) stage.paused = true;
  }).catch((e) => console.warn('3D disabled', e));
} else {
  document.body.classList.add('no-gl');
}

// ---------------------------------------------------------------------------
// Project pages: #work/<id>
// ---------------------------------------------------------------------------
const project = $('#project');
async function route() {
  const m = location.hash.match(/^#work\/([\w-]+)/);
  const p = m && PROJECTS.find((x) => x.id === m[1]);
  if (p) {
    project.innerHTML = projectHTML(p);
    project.style.setProperty('--a', p.palette[1]);
    project.style.setProperty('--b', p.palette[2]);
    project.classList.add('open');
    project.setAttribute('aria-hidden', 'false');
    project.scrollTop = 0;
    document.body.classList.add('project-open');
    viz?.dispose();
    viz = null;
    if (stage) stage.paused = true;
    if (webglOK()) {
      try {
        const { ProjectViz } = await import('./projectviz.js');
        viz = new ProjectViz(project.querySelector('.project__canvas'), p.viz);
      } catch (e) {
        console.warn(e);
      }
    }
    project.querySelector('[data-close]').addEventListener('click', closeProject);
  } else if (project.classList.contains('open')) {
    hideProject();
  }
}
function hideProject() {
  viz?.dispose();
  viz = null;
  project.classList.remove('open');
  project.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('project-open');
  if (stage) stage.paused = false;
}
function closeProject() {
  hideProject();
  history.replaceState(null, '', '#work');
  document.getElementById('work').scrollIntoView({ behavior: 'instant', block: 'start' });
}
project.addEventListener('click', (e) => {
  const a = e.target.closest('a[href="#contact"], a[href="#work"]');
  if (a) {
    e.preventDefault();
    hideProject();
    history.replaceState(null, '', a.getAttribute('href'));
    document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'instant' });
  }
});
addEventListener('keydown', (e) => e.key === 'Escape' && project.classList.contains('open') && closeProject());
addEventListener('hashchange', route);
route();
