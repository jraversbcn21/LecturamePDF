# Graph Report - Lecturame  (2026-11-03)

## Corpus Check
- 62 files · ~53,005 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 453 nodes · 904 edges · 18 communities (14 shown, 4 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 92 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Reproductor, voz y controles
- Aplicacion, almacenamiento y sync
- Extraccion de PDF y sus limites
- Verificacion, PWA y versiones
- Movil y lectura inmersiva
- Marcadores e indice
- API de Vercel y seguridad
- Comprobaciones e2e
- Cadena de lint y tipos
- Configuracion de TypeScript
- Metadatos y scripts npm
- Fixtures de maquetacion
- FakeAudio de los tests
- Skill graphify
- Colores de resaltado
- Portada con clamp()
- Voces neurales de Edge

## God Nodes (most connected - your core abstractions)
1. `App()` - 17 edges
2. `compilerOptions` - 15 edges
3. `extractDoc()` - 14 edges
4. `Reader()` - 13 edges
5. `linesToBlocks()` - 13 edges
6. `usePlayer()` - 12 edges
7. `enqueue()` - 12 edges
8. `updateEntry()` - 11 edges
9. `Block` - 11 edges
10. `PWA: arrancar sin conexión e instalarse en la pantalla de inicio` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Sincronización: fusión por updatedAt y borrado con tombstones` --rationale_for--> `PUT()`  [INFERRED]
  CLAUDE.md → api/library.ts
- `Fusión del servidor leer-fusionar-escribir sin lock` --references--> `PUT()`  [INFERRED]
  PENDIENTE.md → api/library.ts
- `Sincronización: fusión por updatedAt y borrado con tombstones` --rationale_for--> `mergeEntries()`  [INFERRED]
  CLAUDE.md → src/core/merge.ts
- `Descartado: OCR para PDFs escaneados` --conceptually_related_to--> `extractDoc()`  [INFERRED]
  PENDIENTE.md → src/core/pdf/extract.ts
- `Un fragmento se compara con el mayor de los dos tamaños` --rationale_for--> `itemsToLines()`  [INFERRED]
  CLAUDE.md → src/core/pdf/layout.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Las tres suites e2e encadenadas y quien las documenta** — _claude_skills_verify_skill_tres_suites_encadenadas, claude_regla_e2e_no_espera_fija [INFERRED 0.75]
- **Señales con las que se decide dónde acaba un bloque** — src_core_pdf___fixtures___lists_sangria_como_senal, src_core_pdf___fixtures___lists_flush_maqueta_apretada, src_core_pdf___fixtures___lists_flush_marcador_sin_sangria, src_core_pdf___fixtures___sample_orden_de_lectura [INFERRED 0.85]
- **Contenido del que se avisa en vez de recitarlo** — src_core_pdf___fixtures___tables_columnas_alineadas, src_core_pdf___fixtures___tables_formula_con_exponente, src_core_pdf___fixtures___tables_nota_al_pie, src_core_pdf___fixtures___tables_llamada_de_nota [INFERRED 0.85]
- **Mecanismo de la lectura inmersiva** — src_app_components_reader_useimmersive, claude_primer_toque_solo_revela, claude_touchmove_no_scroll, docs_superpowers_specs_2026_09_05_lectura_inmersiva_design_solo_tactil_hover_none, docs_superpowers_plans_2026_09_05_lectura_inmersiva_immersive_delay, docs_superpowers_plans_2026_09_05_lectura_inmersiva_css_max_height_transicion [EXTRACTED 1.00]
- **Lo que sostiene la auditoría de seguridad de la sincronización y la voz** — pendiente_auditoria_seguridad, pendiente_preflight_cors_x_sync_token, pendiente_sin_rate_limiting, pendiente_sync_token, pendiente_tope_gasto_openrouter, pendiente_proxy_tts_descartado, claude_cabecera_x_sync_token [INFERRED 0.85]
- **Robustez de la voz de IA: reintentos, pausa en error y tope de gasto** — claude_voz_ia_una_frase_una_peticion, claude_reintentos_voz_ia, pendiente_voz_ia_se_paraba, pendiente_tope_gasto_openrouter, src_core_tts_fetchaudio [INFERRED 0.85]

## Communities (18 total, 4 thin omitted)

### Community 0 - "Reproductor, voz y controles"
Cohesion: 0.08
Nodes (45): Una frase = una SpeechSynthesisUtterance, Voz de IA: una frase = una petición TTS = un Audio, Plan: Lectura inmersiva, La voz de IA no cachea el audio (caché de una entrada), Kokoro (hexgrad/kokoro-82m) vía OpenRouter, Atajos de teclado, Voz de IA (opcional), voces «(IA, con red)», PlayerControls() (+37 more)

### Community 1 - "Aplicacion, almacenamiento y sync"
Cohesion: 0.11
Nodes (48): Cola de escrituras IndexedDB; lecturas esperan lo pendiente, Campos nuevos de LibraryEntry se normalizan al leer; base 'lecturame', Sincronización: fusión por updatedAt y borrado con tombstones, PDF original en iframe con el visor del navegador (solo #page), Empuje de despedida en pagehide con keepalive cabe en 64 KB, Documento identificado por SHA-256 de sus bytes, App(), Open (+40 more)

### Community 2 - "Extraccion de PDF y sus limites"
Cohesion: 0.09
Nodes (42): Un fragmento se compara con el mayor de los dos tamaños, Tablas y fórmulas se anuncian, no se recitan (riesgo asimétrico; ante la duda, prosa), Umbrales verticales calibrados con el propio documento, Fórmulas dentro de un párrafo se leen símbolo a símbolo, Lista de un solo punto y una sola línea se pega al párrafo, Notas al pie sin numerar se leen como pie de figura, Descartado: OCR para PDFs escaneados, Páginas de índice con puntos de guía se leen enteras (+34 more)

### Community 3 - "Verificacion, PWA y versiones"
Cohesion: 0.06
Nodes (43): pwa.cjs corre contra vite preview, no vite dev, Comprobar el título antes de fiarse de un puerto, Skill /verify, Verificación completa: tests, servidores, e2e, CLAUDE.md (guía del proyecto), PWA: registerType prompt, mjs en globPatterns, /api/ en navigateFallbackDenylist, Restricción de versiones: Vite 5, pdfjs 4, Vitest 2, vite-plugin-pwa 0.21 (Node 18), PWA Implementation Plan (+35 more)

### Community 4 - "Movil y lectura inmersiva"
Cohesion: 0.07
Nodes (33): Desbloqueo de audio de iOS solo en táctil, El lector solo se mueve en vertical (overflow-x, position fixed, touch-action pan-y), Con las barras escondidas, el primer toque solo las trae; no salta la lectura, Desplazamiento animado solo en saltos cortos, Sin recuadro de arrastrar en táctil (hover: none), Se escucha touchmove, no scroll, CSS: max-height + translateY en .screen.reading.immersive, IMMERSIVE_DELAY = 4000 ms (+25 more)

### Community 5 - "Marcadores e indice"
Cohesion: 0.13
Nodes (27): Marcadores con notas, Bookmarks(), keyOf(), Props, Outline(), Props, Spot, useBookmarks() (+19 more)

### Community 6 - "API de Vercel y seguridad"
Cohesion: 0.10
Nodes (29): authorized(), DELETE(), denied(), GET(), idOf(), POST(), authorized(), denied() (+21 more)

### Community 7 - "Comprobaciones e2e"
Cohesion: 0.09
Nodes (22): npm run e2e encadena tres suites: verify.cjs, mobile.cjs y pwa.cjs, Playwright global 1.61.1 en Node 22.13 (NODE_PATH), Regla e2e: no medir tras espera fija; primer nuevo de window.__spoken, Comprobación e2e de la lectura inmersiva (mobile.cjs), Riesgos y cómo se cubren, check(), { chromium, devices }, crypto (+14 more)

### Community 8 - "Cadena de lint y tipos"
Cohesion: 0.07
Nodes (29): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+21 more)

### Community 9 - "Configuracion de TypeScript"
Cohesion: 0.08
Nodes (24): api, DOM, DOM.Iterable, ES2022, node, src, vite/client, vite-plugin-pwa/client (+16 more)

### Community 10 - "Metadatos y scripts npm"
Cohesion: 0.09
Nodes (21): dependencies, pdfjs-dist, react, react-dom, @vercel/blob, name, private, scripts (+13 more)

### Community 11 - "Fixtures de maquetacion"
Cohesion: 0.14
Nodes (18): Cierre de la lista ante el párrafo que la sigue, Fixture lists.pdf: listas sangradas, Fixture lists-flush.pdf: listas al margen del cuerpo, Maqueta apretada sin hueco suficiente, Marcador de lista sin sangría (startsList), Ítem largo con líneas de continuación, La sangría como señal de lista, Detección de idioma sobre el texto reconstruido (+10 more)

### Community 13 - "Skill graphify"
Cohesion: 0.67
Nodes (3): Skill graphify (.claude/skills/graphify/SKILL.md), graphify: rehacer entero, sin .claude/skills/graphify y sin update ., El grafo del 05-09 no conoce la lectura inmersiva

## Knowledge Gaps
- **119 isolated node(s):** `fs`, `path`, `crypto`, `{ chromium, devices }`, `PDF` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Plan: Lectura inmersiva` connect `Reproductor, voz y controles` to `Verificacion, PWA y versiones`, `Movil y lectura inmersiva`, `Comprobaciones e2e`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `PWA Implementation Plan` connect `Verificacion, PWA y versiones` to `Reproductor, voz y controles`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `Restricción de versiones: Vite 5, pdfjs 4, Vitest 2, vite-plugin-pwa 0.21 (Node 18)` connect `Verificacion, PWA y versiones` to `Metadatos y scripts npm`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `crypto` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reproductor, voz y controles` be split into smaller, more focused modules?**
  _Cohesion score 0.08106219426974144 - nodes in this community are weakly interconnected._
- **Should `Aplicacion, almacenamiento y sync` be split into smaller, more focused modules?**
  _Cohesion score 0.1081277213352685 - nodes in this community are weakly interconnected._
- **Should `Extraccion de PDF y sus limites` be split into smaller, more focused modules?**
  _Cohesion score 0.08925979680696662 - nodes in this community are weakly interconnected._