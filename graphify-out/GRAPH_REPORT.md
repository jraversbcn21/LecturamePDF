# Graph Report - Lecturame  (2026-08-19)

## Corpus Check
- Corpus is ~30,025 words - fits in a single context window. You may not need a graph.

## Summary
- 332 nodes · 625 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 135,519 input · 0 output

## Community Hubs (Navigation)
- Verificación y decisiones de fondo
- Núcleo de extracción de PDF
- Reproductor y controles
- Biblioteca y almacenamiento
- Vista de lectura, índice y búsqueda
- Cadena de lint
- Configuración de TypeScript
- Marcadores y notas
- Dependencias y scripts npm
- Fixtures de maquetación
- Comprobaciones de navegador
- Tablas, fórmulas y panel del PDF
- Skill graphify
- Maquetación a varias columnas
- Notas al pie sin numerar

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
- `Normalización de LibraryEntry al leer (complete())` --semantically_similar_to--> `Selección automática de voz`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `OCR para PDFs escaneados (descartado)` --semantically_similar_to--> `Restricción de versiones (Node 18)`  [INFERRED] [semantically similar]
  PENDIENTE.md → CLAUDE.md
- `Desplazamiento animado solo en saltos cortos` --conceptually_related_to--> `Tubería PDF → bloques → frases → voz → resaltado`  [INFERRED]
  CLAUDE.md → README.md
- `Restricción de versiones (Node 18)` --conceptually_related_to--> `Lecturame`  [INFERRED]
  CLAUDE.md → README.md
- `index.html (punto de entrada)` --implements--> `Lecturame`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Heurísticas de maquetación del PDF** — claude_md_extraccion_pdf, claude_md_umbrales_calibrados, claude_md_comparar_con_el_mayor, claude_md_lookslikeformula, claude_md_aviso_tablas_formulas, claude_md_fixtures_pdf_reales [EXTRACTED 1.00]
- **Flujo de verificación antes de terminar** — claude_md_antes_de_terminar, _claude_skills_verify_skill_md_verify, _claude_skills_verify_skill_md_tests_unitarios, _claude_skills_verify_skill_md_servidor_desarrollo, _claude_skills_verify_skill_md_comprobaciones_navegador, _claude_skills_verify_skill_md_build, readme_md_e2e_verify_cjs [EXTRACTED 1.00]
- **Persistencia por documento en IndexedDB** — readme_md_progreso_sha256, claude_md_cola_escrituras_indexeddb, claude_md_normalizacion_libraryentry, readme_md_marcadores_con_notas, readme_md_seleccion_de_voz, claude_md_indexeddb_sin_version [INFERRED 0.85]
- **Contenido del que se avisa en vez de recitarlo** — src_core_pdf___fixtures___tables_columnas_alineadas, src_core_pdf___fixtures___tables_formula_con_exponente, src_core_pdf___fixtures___tables_nota_al_pie, src_core_pdf___fixtures___tables_llamada_de_nota [INFERRED 0.85]
- **Señales con las que se decide dónde acaba un bloque** — src_core_pdf___fixtures___lists_sangria_como_senal, src_core_pdf___fixtures___lists_flush_maqueta_apretada, src_core_pdf___fixtures___lists_flush_marcador_sin_sangria, src_core_pdf___fixtures___sample_orden_de_lectura [INFERRED 0.85]

## Communities (17 total, 3 thin omitted)

### Community 0 - "Verificación y decisiones de fondo"
Cohesion: 0.06
Nodes (42): Paso 4: build, Paso 3: comprobaciones en navegador, Informe de verificación, Paso 2: servidor de desarrollo, Paso 1: tests, typecheck y lint, Skill verify, Antes de dar algo por terminado, Cola de escrituras a IndexedDB (+34 more)

### Community 1 - "Núcleo de extracción de PDF"
Cohesion: 0.12
Nodes (31): detectLanguage(), score(), STOPWORDS, announce(), extractDoc(), isAnnounced(), linesPerPage(), ScannedPdfError (+23 more)

### Community 2 - "Reproductor y controles"
Cohesion: 0.12
Nodes (28): PlayerControls(), Props, Props, clamp(), flatIndex(), initPlayer(), PlayerAction, playerReducer() (+20 more)

### Community 3 - "Biblioteca y almacenamiento"
Cohesion: 0.13
Nodes (31): App(), Open, Library(), percentOf(), Props, PdfPane(), Props, usePdfUrl() (+23 more)

### Community 4 - "Vista de lectura, índice y búsqueda"
Cohesion: 0.10
Nodes (25): Outline(), Props, Reader(), useKeyboard(), Mark, Props, ReaderView(), withMarks() (+17 more)

### Community 5 - "Cadena de lint"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+19 more)

### Community 6 - "Configuración de TypeScript"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, node, src, vite/client, compilerOptions, isolatedModules (+14 more)

### Community 7 - "Marcadores y notas"
Cohesion: 0.21
Nodes (17): Bookmarks(), keyOf(), Props, Spot, useBookmarks(), Bookmark, byPosition(), isBookmarked() (+9 more)

### Community 8 - "Dependencias y scripts npm"
Cohesion: 0.10
Nodes (19): dependencies, pdfjs-dist, react, react-dom, name, private, scripts, build (+11 more)

### Community 9 - "Fixtures de maquetación"
Cohesion: 0.14
Nodes (18): Cierre de la lista ante el párrafo que la sigue, Fixture lists.pdf: listas sangradas, Fixture lists-flush.pdf: listas al margen del cuerpo, Maqueta apretada sin hueco suficiente, Marcador de lista sin sangría (startsList), Ítem largo con líneas de continuación, La sangría como señal de lista, Detección de idioma sobre el texto reconstruido (+10 more)

### Community 10 - "Comprobaciones de navegador"
Cohesion: 0.17
Nodes (7): { chromium }, fs, path, PDF, results, SHOTS, TABLES_PDF

### Community 11 - "Tablas, fórmulas y panel del PDF"
Cohesion: 0.24
Nodes (10): Riesgo asimétrico al detectar tablas y fórmulas, Desplazamiento animado solo en saltos cortos, looksLikeFormula exige tres señales, PDF original en el visor del navegador (iframe), Pendiente: fórmulas dentro de un párrafo, Pendiente: resaltar la frase en el PDF, Limitación: fórmulas dentro de un párrafo, Limitación: el panel del PDF no resalta (+2 more)

## Knowledge Gaps
- **96 isolated node(s):** `fs`, `path`, `{ chromium }`, `PDF`, `TABLES_PDF` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Cadena de lint` to `Dependencias y scripts npm`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Block` connect `Vista de lectura, índice y búsqueda` to `Núcleo de extracción de PDF`, `Marcadores y notas`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Extracción de bloques y títulos` connect `Verificación y decisiones de fondo` to `Tablas, fórmulas y panel del PDF`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ chromium }` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Verificación y decisiones de fondo` be split into smaller, more focused modules?**
  _Cohesion score 0.06039488966318235 - nodes in this community are weakly interconnected._
- **Should `Núcleo de extracción de PDF` be split into smaller, more focused modules?**
  _Cohesion score 0.1207897793263647 - nodes in this community are weakly interconnected._
- **Should `Reproductor y controles` be split into smaller, more focused modules?**
  _Cohesion score 0.12162162162162163 - nodes in this community are weakly interconnected._