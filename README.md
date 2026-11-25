# ARQEN — Build Beyond Reality

Premium scrolling studio website with real-time 3D (Three.js + Vite). One fixed WebGL canvas draws the hero emblem scene and, via scissor, every service card and project mockup. No image assets.

- `npm install` then `npm run dev` for local work, `npm run build` for the static site in `dist/`.
- All copy lives in `src/content.js`. Contact links are in `CONTACT` there.
- `src/three/*` hero, service-card scenes and the shared stage; `src/ui.js` page markup, interactions and contact form; `src/projectviz.js` the 3D visual of each concept project.
- Add `?q=low` or `?q=high` to the URL to force a quality level.

Deployed from the `gh-pages` branch (built `dist/`).
