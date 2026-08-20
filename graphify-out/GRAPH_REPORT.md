# Graph Report - Lecturame  (2026-08-20)

## Corpus Check
- Corpus is ~35,339 words - fits in a single context window. You may not need a graph.

## Summary
- 344 nodes · 650 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.82)
- Token cost: 80,517 input · 0 output

## Community Hubs (Navigation)
- Reproductor y controles
- Nucleo de extraccion de PDF
- Biblioteca, portada y visor PDF
- Vista de lectura e indice
- Decisiones que no conviene deshacer
- Cadena de lint
- Configuracion de TypeScript
- Marcadores y notas
- Dependencias y scripts npm
- Heuristicas de listas y fixtures
- Comprobaciones de navegador
- Convenciones y flujo de verificacion
- Temas y resaltados
- Skill graphify

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `extractDoc()` - 13 edges
3. `usePlayer()` - 12 edges
4. `Reader()` - 11 edges
5. `linesToBlocks()` - 11 edges
6. `Block` - 11 edges
7. `enqueue()` - 10 edges
8. `App()` - 9 edges
9. `dropRunningHeads()` - 9 edges
10. `updateEntry()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Una frase = una SpeechSynthesisUtterance` --semantically_similar_to--> `Voz: una frase = una locución`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `Progreso por SHA-256 del PDF` --shares_data_with--> `Cola de escrituras a IndexedDB`  [INFERRED]
  README.md → CLAUDE.md
- `Los tres resaltados por modo` --semantically_similar_to--> `Los tres resaltados se eligen juntos`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `La portada y la estantería` --semantically_similar_to--> `La portada crece con clamp(), no con el zoom`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Panel del PDF original` --semantically_similar_to--> `PDF original en iframe con el visor del navegador`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Señales con las que se decide dónde acaba un bloque** — src_core_pdf___fixtures___lists_sangria_como_senal, src_core_pdf___fixtures___lists_flush_maqueta_apretada, src_core_pdf___fixtures___lists_flush_marcador_sin_sangria, src_core_pdf___fixtures___sample_orden_de_lectura [INFERRED 0.85]
- **Contenido del que se avisa en vez de recitarlo** — src_core_pdf___fixtures___tables_columnas_alineadas, src_core_pdf___fixtures___tables_formula_con_exponente, src_core_pdf___fixtures___tables_nota_al_pie, src_core_pdf___fixtures___tables_llamada_de_nota [INFERRED 0.85]
- **Regla de oro: una frase = una locución** — claude_una_frase_una_utterance, claude_voz_ia_una_peticion_un_audio, readme_voz_una_frase_una_locucion, pendiente_pause_resume_nativos [EXTRACTED 1.00]
- **Riesgo asimétrico: ante la duda, prosa** — claude_riesgo_asimetrico_tablas_formulas, readme_tablas_y_formulas, pendiente_indices_con_puntos_de_guia, pendiente_formulas_en_parrafo, claude_voz_ia_una_peticion_un_audio [EXTRACTED 1.00]
- **Voz de IA por OpenRouter** — readme_voz_de_ia, claude_voz_ia_una_peticion_un_audio, pendiente_cuota_voz_ia, pendiente_cache_audio_voz_ia, pendiente_sin_resaltado_de_palabra_ia [EXTRACTED 1.00]

## Communities (16 total, 1 thin omitted)

### Community 0 - "Reproductor y controles"
Cohesion: 0.08
Nodes (35): PlayerControls(), Props, clamp(), flatIndex(), initPlayer(), neighbor(), PlayerAction, playerReducer() (+27 more)

### Community 1 - "Nucleo de extraccion de PDF"
Cohesion: 0.12
Nodes (32): detectLanguage(), score(), STOPWORDS, announce(), extractDoc(), isAnnounced(), linesPerPage(), ScannedPdfError (+24 more)

### Community 2 - "Biblioteca, portada y visor PDF"
Cohesion: 0.12
Nodes (35): App(), Open, Library(), percentOf(), Props, PdfPane(), Props, usePdfUrl() (+27 more)

### Community 3 - "Vista de lectura e indice"
Cohesion: 0.11
Nodes (27): Outline(), Props, Props, Reader(), useKeyboard(), Mark, Props, ReaderView() (+19 more)

### Community 4 - "Decisiones que no conviene deshacer"
Cohesion: 0.06
Nodes (34): Desplazamiento animado solo en saltos cortos, Fixtures de PDFs reales, Un fragmento se compara con el mayor de los dos, La portada crece con clamp(), no con el zoom, Restricción de versiones (Node 18), Riesgo asimétrico: ante la duda, prosa, Umbrales verticales calibrados con el propio documento, Una frase = una SpeechSynthesisUtterance (+26 more)

### Community 5 - "Cadena de lint"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+19 more)

### Community 6 - "Configuracion de TypeScript"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2022, node, src, vite/client, compilerOptions, isolatedModules (+14 more)

### Community 7 - "Marcadores y notas"
Cohesion: 0.21
Nodes (17): Bookmarks(), keyOf(), Props, Spot, useBookmarks(), Bookmark, byPosition(), isBookmarked() (+9 more)

### Community 8 - "Dependencias y scripts npm"
Cohesion: 0.10
Nodes (19): dependencies, pdfjs-dist, react, react-dom, name, private, scripts, build (+11 more)

### Community 9 - "Heuristicas de listas y fixtures"
Cohesion: 0.14
Nodes (18): Cierre de la lista ante el párrafo que la sigue, Fixture lists.pdf: listas sangradas, Fixture lists-flush.pdf: listas al margen del cuerpo, Maqueta apretada sin hueco suficiente, Marcador de lista sin sangría (startsList), Ítem largo con líneas de continuación, La sangría como señal de lista, Detección de idioma sobre el texto reconstruido (+10 more)

### Community 10 - "Comprobaciones de navegador"
Cohesion: 0.15
Nodes (7): { chromium }, fs, path, PDF, results, SHOTS, TABLES_PDF

### Community 11 - "Convenciones y flujo de verificacion"
Cohesion: 0.18
Nodes (12): Skill /verify, Cola de escrituras a IndexedDB, Comprobaciones en navegador sin esperas fijas, Convención de comentarios ponytail:, Grafo graphify del proyecto, Campos nuevos de LibraryEntry se normalizan al leer, Playwright global con NODE_PATH, Caché de audio de la voz de IA (+4 more)

### Community 12 - "Temas y resaltados"
Cohesion: 0.50
Nodes (4): Los tres resaltados se eligen juntos, La estrella del marcador en oro, Temas «Papel» y «Tinta», Los tres resaltados por modo

## Knowledge Gaps
- **94 isolated node(s):** `fs`, `path`, `{ chromium }`, `PDF`, `TABLES_PDF` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Cadena de lint` to `Dependencias y scripts npm`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Block` connect `Vista de lectura e indice` to `Nucleo de extraccion de PDF`, `Marcadores y notas`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ chromium }` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reproductor y controles` be split into smaller, more focused modules?**
  _Cohesion score 0.08115942028985507 - nodes in this community are weakly interconnected._
- **Should `Nucleo de extraccion de PDF` be split into smaller, more focused modules?**
  _Cohesion score 0.11738648947951273 - nodes in this community are weakly interconnected._
- **Should `Biblioteca, portada y visor PDF` be split into smaller, more focused modules?**
  _Cohesion score 0.12073170731707317 - nodes in this community are weakly interconnected._
- **Should `Vista de lectura e indice` be split into smaller, more focused modules?**
  _Cohesion score 0.11379800853485064 - nodes in this community are weakly interconnected._