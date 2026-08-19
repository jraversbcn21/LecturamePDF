# Graph Report - Lecturame  (2026-08-19)

## Corpus Check
- Corpus is ~30,885 words - fits in a single context window. You may not need a graph.

## Summary
- 337 nodes · 632 edges · 15 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.75)
- Token cost: 72,404 input · 0 output

## Community Hubs (Navigation)
- Núcleo de extracción de PDF
- Reproductor y controles
- Índice, marcadores y notas
- Biblioteca, portada y almacenamiento
- Decisiones que no conviene deshacer
- Cadena de lint
- Heurísticas, convenciones y pendientes
- Configuración de TypeScript
- Vista de lectura y búsqueda
- Dependencias y scripts npm
- Fixtures de maquetación
- Comprobaciones de navegador
- Skill verify

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `extractDoc()` - 13 edges
3. `usePlayer()` - 12 edges
4. `linesToBlocks()` - 11 edges
5. `Block` - 11 edges
6. `Reader()` - 10 edges
7. `App()` - 9 edges
8. `enqueue()` - 9 edges
9. `scripts` - 8 edges
10. `useBookmarks()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `El riesgo no es simétrico: ante la duda, prosa` --semantically_similar_to--> `OCR para PDFs escaneados (descartado)`  [INFERRED] [semantically similar]
  CLAUDE.md → PENDIENTE.md
- `Desplazamiento animado solo en saltos cortos` --conceptually_related_to--> `Los tres resaltados`  [INFERRED]
  CLAUDE.md → README.md
- `Punto de montaje #root` --implements--> `LecturamePDF`  [INFERRED]
  index.html → README.md
- `layout.ts es lógica pura, sin pdf.js` --rationale_for--> `Extracción de líneas y bloques`  [EXTRACTED]
  CLAUDE.md → README.md
- `Una frase = una SpeechSynthesisUtterance` --conceptually_related_to--> `Selección de voz por idioma`  [INFERRED]
  CLAUDE.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de verificación antes de terminar** — _claude_skills_verify_skill_md_verify, _claude_skills_verify_skill_md_tests_unitarios, _claude_skills_verify_skill_md_servidor_desarrollo, _claude_skills_verify_skill_md_comprobaciones_navegador, _claude_skills_verify_skill_md_build [EXTRACTED 1.00]
- **Señales con las que se decide dónde acaba un bloque** — src_core_pdf___fixtures___lists_sangria_como_senal, src_core_pdf___fixtures___lists_flush_maqueta_apretada, src_core_pdf___fixtures___lists_flush_marcador_sin_sangria, src_core_pdf___fixtures___sample_orden_de_lectura [INFERRED 0.85]
- **Contenido del que se avisa en vez de recitarlo** — src_core_pdf___fixtures___tables_columnas_alineadas, src_core_pdf___fixtures___tables_formula_con_exponente, src_core_pdf___fixtures___tables_nota_al_pie, src_core_pdf___fixtures___tables_llamada_de_nota [INFERRED 0.85]
- **Flujo PDF → bloques → frases → voz → resaltado** — readme_extraccion_de_bloques, readme_deteccion_de_idioma, readme_seleccion_de_voz, claude_una_frase_una_utterance, readme_tres_resaltados, readme_progreso_por_sha256 [EXTRACTED 1.00]
- **Heurísticas de layout.ts y su calibración** — claude_layout_logica_pura, claude_umbrales_verticales_calibrados, claude_comparar_con_el_mayor_de_los_dos, claude_riesgo_asimetrico, claude_fixtures_de_pdf [EXTRACTED 1.00]
- **Persistencia en IndexedDB y su migración** — claude_cola_de_escrituras_indexeddb, claude_normalizacion_de_libraryentry, claude_base_lecturame, claude_indexeddb_sin_version_fija, readme_progreso_por_sha256 [EXTRACTED 1.00]

## Communities (15 total, 0 thin omitted)

### Community 0 - "Núcleo de extracción de PDF"
Cohesion: 0.12
Nodes (31): detectLanguage(), score(), STOPWORDS, announce(), extractDoc(), isAnnounced(), linesPerPage(), ScannedPdfError (+23 more)

### Community 1 - "Reproductor y controles"
Cohesion: 0.12
Nodes (28): PlayerControls(), Props, Props, clamp(), flatIndex(), initPlayer(), PlayerAction, playerReducer() (+20 more)

### Community 2 - "Índice, marcadores y notas"
Cohesion: 0.13
Nodes (27): Bookmarks(), keyOf(), Props, Outline(), Props, Reader(), useKeyboard(), Spot (+19 more)

### Community 3 - "Biblioteca, portada y almacenamiento"
Cohesion: 0.14
Nodes (30): App(), Open, Library(), percentOf(), Props, PdfPane(), Props, usePdfUrl() (+22 more)

### Community 4 - "Decisiones que no conviene deshacer"
Cohesion: 0.07
Nodes (33): La base sigue llamándose lecturame, Cola de escrituras a IndexedDB, Comprobaciones en navegador con Playwright, Desplazamiento animado solo en saltos cortos, Abrir IndexedDB sin fijar versión en las comprobaciones, No medir el estado tras una espera fija, Normalización de LibraryEntry al leer, npm run verify (+25 more)

### Community 5 - "Cadena de lint"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+19 more)

### Community 6 - "Heurísticas, convenciones y pendientes"
Cohesion: 0.10
Nodes (24): Skill graphify (.claude/skills/graphify/SKILL.md), Comentarios `ponytail:`, Un fragmento se compara con el mayor de los dos, Convenciones del repositorio, Fixtures de PDFs reales, graphify: el grafo del proyecto, El grafo se rehace entero, no con `update .`, layout.ts es lógica pura, sin pdf.js (+16 more)

### Community 7 - "Configuración de TypeScript"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, node, src, vite/client, compilerOptions, isolatedModules (+14 more)

### Community 8 - "Vista de lectura y búsqueda"
Cohesion: 0.14
Nodes (16): Mark, Props, ReaderView(), withMarks(), Props, Search(), snippetOf(), summaryOf() (+8 more)

### Community 9 - "Dependencias y scripts npm"
Cohesion: 0.10
Nodes (19): dependencies, pdfjs-dist, react, react-dom, name, private, scripts, build (+11 more)

### Community 10 - "Fixtures de maquetación"
Cohesion: 0.14
Nodes (18): Cierre de la lista ante el párrafo que la sigue, Fixture lists.pdf: listas sangradas, Fixture lists-flush.pdf: listas al margen del cuerpo, Maqueta apretada sin hueco suficiente, Marcador de lista sin sangría (startsList), Ítem largo con líneas de continuación, La sangría como señal de lista, Detección de idioma sobre el texto reconstruido (+10 more)

### Community 11 - "Comprobaciones de navegador"
Cohesion: 0.17
Nodes (7): { chromium }, fs, path, PDF, results, SHOTS, TABLES_PDF

### Community 12 - "Skill verify"
Cohesion: 0.40
Nodes (6): Paso 4: build, Paso 3: comprobaciones en navegador, Informe de verificación, Paso 2: servidor de desarrollo, Paso 1: tests, typecheck y lint, Skill verify

## Knowledge Gaps
- **89 isolated node(s):** `fs`, `path`, `{ chromium }`, `PDF`, `TABLES_PDF` (+84 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Extracción de líneas y bloques` connect `Heurísticas, convenciones y pendientes` to `Decisiones que no conviene deshacer`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Cadena de lint` to `Dependencias y scripts npm`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ chromium }` to the rest of the system?**
  _89 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Núcleo de extracción de PDF` be split into smaller, more focused modules?**
  _Cohesion score 0.1207897793263647 - nodes in this community are weakly interconnected._
- **Should `Reproductor y controles` be split into smaller, more focused modules?**
  _Cohesion score 0.12162162162162163 - nodes in this community are weakly interconnected._
- **Should `Índice, marcadores y notas` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._
- **Should `Biblioteca, portada y almacenamiento` be split into smaller, more focused modules?**
  _Cohesion score 0.13781512605042018 - nodes in this community are weakly interconnected._