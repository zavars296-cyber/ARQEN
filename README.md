# ARQEN — Build Beyond Reality

Studio website built as an explorable 3D cyberpunk city (Three.js + Vite). Everything (buildings, neon, adverts, traffic, crowds, holograms) is generated procedurally at runtime; there are no image assets.

- `npm install` then `npm run dev` for local work, `npm run build` for the static site in `dist/`.
- All copy lives in `src/content.js`. Contact links are in `CONTACT` there.
- `src/world/*` builds the city; `src/ui.js` the panels, project pages and contact form; `src/projectviz.js` the 3D hero visual of each concept project.
- Add `?q=low` or `?q=high` to the URL to force a quality level.

Deployed from the `gh-pages` branch (built `dist/`).
