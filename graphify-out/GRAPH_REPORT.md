# Graph Report - Lecturame  (2026-09-05)

## Corpus Check
- Corpus is ~48,071 words - fits in a single context window. You may not need a graph.

## Summary
- 445 nodes · 897 edges · 30 communities (22 shown, 8 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.83)
- Token cost: 206,566 input · 0 output

## Community Hubs (Navigation)
- Reproductor, lector y controles
- Decisiones de fondo (CLAUDE.md)
- Aplicacion, biblioteca y panel del PDF
- Extraccion de PDF e idioma
- Indice y buscador
- Configuracion de TypeScript
- API de Vercel y sincronizacion
- Marcadores
- Heuristicas de maquetacion y sus fixtures
- Cadena de lint y tipos
- PWA: plan, spec y restriccion de versiones
- Comprobaciones de escritorio
- Comprobaciones moviles y de sync
- Como se verifica el proyecto
- Icono de la aplicacion
- Suite e2e sin conexion
- Dependencias de ejecucion
- Scripts npm
- Metadatos de package.json
- PWA: decision, documentacion y prueba en iPhone
- Icono y meta PWA en index.html
- eslint-plugin-react-hooks
- @types/react
- @types/react-dom
- typescript-eslint
- vite-plugin-pwa (dependencia)
- @vitejs/plugin-react
- vitest
- Skill graphify

## God Nodes (most connected - your core abstractions)
1. `App()` - 17 edges
2. `compilerOptions` - 15 edges
3. `extractDoc()` - 13 edges
4. `Reader()` - 12 edges
5. `usePlayer()` - 12 edges
6. `linesToBlocks()` - 11 edges
7. `enqueue()` - 11 edges
8. `updateEntry()` - 11 edges
9. `Block` - 11 edges
10. `dropRunningHeads()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Los campos nuevos de LibraryEntry se normalizan al leer` --rationale_for--> `complete()`  [EXTRACTED]
  CLAUDE.md → src/core/storage.ts
- `npm run e2e: verify.cjs y mobile.cjs, motor de síntesis falso` --conceptually_related_to--> `npm run e2e encadena tres suites: verify.cjs, mobile.cjs y pwa.cjs`  [AMBIGUOUS]
  README.md → .claude/skills/verify/SKILL.md
- `Fuera de alcance a propósito` --conceptually_related_to--> `La PWA, probada en el iPhone el 05-09-2026`  [INFERRED]
  docs/superpowers/specs/2026-09-05-pwa-design.md → PENDIENTE.md
- `Task 3: Suite e2e offline (e2e/pwa.cjs)` --rationale_for--> `check()`  [EXTRACTED]
  docs/superpowers/plans/2026-09-05-pwa.md → e2e/pwa.cjs
- `npm run e2e encadena tres suites: verify.cjs, mobile.cjs y pwa.cjs` --conceptually_related_to--> `Comprobaciones en navegador: no medir tras una espera fija`  [INFERRED]
  .claude/skills/verify/SKILL.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Señales con las que se decide dónde acaba un bloque** — src_core_pdf___fixtures___lists_sangria_como_senal, src_core_pdf___fixtures___lists_flush_maqueta_apretada, src_core_pdf___fixtures___lists_flush_marcador_sin_sangria, src_core_pdf___fixtures___sample_orden_de_lectura [INFERRED 0.85]
- **Contenido del que se avisa en vez de recitarlo** — src_core_pdf___fixtures___tables_columnas_alineadas, src_core_pdf___fixtures___tables_formula_con_exponente, src_core_pdf___fixtures___tables_nota_al_pie, src_core_pdf___fixtures___tables_llamada_de_nota [INFERRED 0.85]
- **Documentación cruzada de la PWA (decisión, uso, pendiente, plan, spec)** — claude_pwa_se_actualiza_en_el_siguiente_arranque, readme_sin_conexion_y_en_pantalla_de_inicio, pendiente_pwa_probada_en_iphone, docs_superpowers_plans_2026_09_05_pwa_task4_documentacion, docs_superpowers_specs_2026_09_05_pwa_design_document [INFERRED 0.85]
- **Las tres suites e2e encadenadas y quien las documenta** — _claude_skills_verify_skill_tres_suites_encadenadas, readme_e2e_uso, claude_comprobaciones_en_navegador [INFERRED 0.75]
- **Decisiones de tts.ts: una locución, desbloqueo táctil de iOS y no cachear audio** — claude_una_frase_una_speechsynthesisutterance, claude_voz_de_ia_regla_de_oro, claude_desbloqueo_de_audio_de_ios_solo_en_tactil, pendiente_pause_resume_nativos, pendiente_voz_de_ia_no_cachea_audio [INFERRED 0.85]

## Communities (30 total, 8 thin omitted)

### Community 0 - "Reproductor, lector y controles"
Cohesion: 0.07
Nodes (45): PlayerControls(), Props, Props, Mark, Props, ReaderView(), withMarks(), clamp() (+37 more)

### Community 1 - "Decisiones de fondo (CLAUDE.md)"
Cohesion: 0.05
Nodes (48): Los campos nuevos de LibraryEntry se normalizan al leer, El desbloqueo de audio de iOS solo se registra en táctil, El desplazamiento solo se anima en saltos cortos, Fixtures reales de src/core/pdf/__fixtures__ para probar layout.ts, Un fragmento se compara con el mayor de los dos, no con el suyo, El grafo de graphify se rehace entero, no por costumbre, Las escrituras a IndexedDB van por una cola, El lector solo se mueve arriba y abajo, tres propiedades CSS que van juntas (+40 more)

### Community 2 - "Aplicacion, biblioteca y panel del PDF"
Cohesion: 0.12
Nodes (45): El recuadro de arrastrar no existe en táctil, App(), Open, Library(), percentOf(), Props, PdfPane(), Props (+37 more)

### Community 3 - "Extraccion de PDF e idioma"
Cohesion: 0.12
Nodes (32): detectLanguage(), score(), STOPWORDS, announce(), extractDoc(), isAnnounced(), linesPerPage(), ScannedPdfError (+24 more)

### Community 4 - "Indice y buscador"
Cohesion: 0.14
Nodes (18): Outline(), Props, Props, Search(), snippetOf(), summaryOf(), activeEntry(), headingLevel() (+10 more)

### Community 5 - "Configuracion de TypeScript"
Cohesion: 0.08
Nodes (24): api, DOM, DOM.Iterable, ES2022, node, src, vite/client, vite-plugin-pwa/client (+16 more)

### Community 6 - "API de Vercel y sincronizacion"
Cohesion: 0.17
Nodes (16): authorized(), DELETE(), denied(), GET(), idOf(), authorized(), denied(), GET() (+8 more)

### Community 7 - "Marcadores"
Cohesion: 0.21
Nodes (17): Bookmarks(), keyOf(), Props, Spot, useBookmarks(), Bookmark, byPosition(), isBookmarked() (+9 more)

### Community 8 - "Heuristicas de maquetacion y sus fixtures"
Cohesion: 0.14
Nodes (18): Cierre de la lista ante el párrafo que la sigue, Fixture lists.pdf: listas sangradas, Fixture lists-flush.pdf: listas al margen del cuerpo, Maqueta apretada sin hueco suficiente, Marcador de lista sin sangría (startsList), Ítem largo con líneas de continuación, La sangría como señal de lista, Detección de idioma sobre el texto reconstruido (+10 more)

### Community 9 - "Cadena de lint y tipos"
Cohesion: 0.13
Nodes (15): eslint, @eslint/js, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-refresh (+7 more)

### Community 10 - "PWA: plan, spec y restriccion de versiones"
Cohesion: 0.22
Nodes (12): Convenciones del repositorio: commits en español explicando el porqué, Restricción de versiones: Node 18, Vite 5, pdfjs-dist 4, Vitest 2, vite-plugin-pwa 0.21, PWA Implementation Plan, Goal: LecturamePDF arranque sin conexión e instalable en el iPhone, Task 2: Plugin, manifest y registro del service worker, Actualización en el siguiente arranque, Descartados: service worker a mano e injectManifest, PWA: arrancar sin conexión e instalarse en la pantalla de inicio (+4 more)

### Community 11 - "Comprobaciones de escritorio"
Cohesion: 0.15
Nodes (7): { chromium }, fs, path, PDF, results, SHOTS, TABLES_PDF

### Community 12 - "Comprobaciones moviles y de sync"
Cohesion: 0.25
Nodes (10): check(), { chromium, devices }, crypto, fakeSpeech(), fs, mobile(), path, PDF (+2 more)

### Community 13 - "Como se verifica el proyecto"
Cohesion: 0.20
Nodes (10): pwa.cjs corre contra vite preview, no vite dev, Comprobar el título antes de fiarse de un puerto, Skill /verify, npm run e2e encadena tres suites: verify.cjs, mobile.cjs y pwa.cjs, Verificación completa: tests, servidores, e2e, npm run verify y npm run e2e en verde antes de terminar, Comprobaciones en navegador: no medir tras una espera fija, Task 5: Cierre (verify, deploy, prueba en iPhone) (+2 more)

### Community 14 - "Icono de la aplicacion"
Cohesion: 0.20
Nodes (9): Fondo opaco a sangre completa, Icono de la aplicación LecturamePDF, Zona segura de icono maskable, { chromium }, fs, path, PUBLIC, SIZES (+1 more)

### Community 15 - "Suite e2e sin conexion"
Cohesion: 0.28
Nodes (8): Task 3: Suite e2e offline (e2e/pwa.cjs), Comprobación e2e contra vite preview, check(), { chromium }, offline(), path, PDF, results

### Community 16 - "Dependencias de ejecucion"
Cohesion: 0.22
Nodes (9): dependencies, pdfjs-dist, react, react-dom, @vercel/blob, pdfjs-dist, react, react-dom (+1 more)

### Community 17 - "Scripts npm"
Cohesion: 0.25
Nodes (8): scripts, build, dev, e2e, lint, preview, test, verify

### Community 18 - "Metadatos de package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 19 - "PWA: decision, documentacion y prueba en iPhone"
Cohesion: 1.00
Nodes (4): La PWA se actualiza en el siguiente arranque, y el precache lleva tres líneas que no son opcionales, Task 4: Documentación de la PWA, La PWA, probada en el iPhone el 05-09-2026, Sin conexión y en la pantalla de inicio

### Community 20 - "Icono y meta PWA en index.html"
Cohesion: 0.67
Nodes (3): Task 1: Icono (SVG + script de rasterizado), Icono propio y sencillo, sin dependencias nuevas, Meta PWA en index.html: theme-color, icon, apple-touch-icon

## Ambiguous Edges - Review These
- `npm run e2e encadena tres suites: verify.cjs, mobile.cjs y pwa.cjs` → `npm run e2e: verify.cjs y mobile.cjs, motor de síntesis falso`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **106 isolated node(s):** `fs`, `path`, `crypto`, `{ chromium, devices }`, `PDF` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `npm run e2e encadena tres suites: verify.cjs, mobile.cjs y pwa.cjs` and `npm run e2e: verify.cjs y mobile.cjs, motor de síntesis falso`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `npm run e2e encadena tres suites: verify.cjs, mobile.cjs y pwa.cjs` connect `Como se verifica el proyecto` to `Comprobaciones de escritorio`, `Comprobaciones moviles y de sync`, `Suite e2e sin conexion`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `Comprobaciones en navegador: no medir tras una espera fija` connect `Como se verifica el proyecto` to `Decisiones de fondo (CLAUDE.md)`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `La sincronización fusiona por updatedAt y borra con tombstones` connect `API de Vercel y sincronizacion` to `Decisiones de fondo (CLAUDE.md)`, `Aplicacion, biblioteca y panel del PDF`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `crypto` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reproductor, lector y controles` be split into smaller, more focused modules?**
  _Cohesion score 0.06954997077732321 - nodes in this community are weakly interconnected._
- **Should `Decisiones de fondo (CLAUDE.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.054901960784313725 - nodes in this community are weakly interconnected._