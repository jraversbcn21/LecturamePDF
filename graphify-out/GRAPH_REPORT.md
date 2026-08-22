# Graph Report - Lecturame  (2026-08-22)

## Corpus Check
- Corpus is ~29,163 words - fits in a single context window. You may not need a graph.

## Summary
- 411 nodes · 854 edges · 14 communities
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.87)
- Token cost: 163,084 input · 0 output

## Community Hubs (Navigation)
- Extraccion de PDF y sus heuristicas
- Reproductor, voz y controles
- Lectura: temas, indice y marcadores
- Biblioteca, almacenamiento y sincronizacion
- Cadena de lint
- Configuracion de TypeScript
- Como se trabaja en este proyecto
- Despliegue en Vercel y subida de PDFs
- Dependencias y scripts npm
- Fusion de bibliotecas en el servidor
- Comprobaciones de escritorio
- Comprobaciones moviles y de sync

## God Nodes (most connected - your core abstractions)
1. `linesToBlocks()` - 19 edges
2. `App()` - 17 edges
3. `extractDoc()` - 15 edges
4. `compilerOptions` - 15 edges
5. `Reader()` - 12 edges
6. `usePlayer()` - 12 edges
7. `itemsToLines()` - 12 edges
8. `enqueue()` - 12 edges
9. `blocksOf()` - 11 edges
10. `dropRunningHeads()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Paginas de indice con puntos de guia` --semantically_similar_to--> `tableRows()`  [INFERRED] [semantically similar]
  PENDIENTE.md → src/core/pdf/layout.ts
- `Los PDFs suben directos del navegador a Blob` --rationale_for--> `uploadPdf()`  [INFERRED]
  CLAUDE.md → src/core/sync.ts
- `Vigilar el gasto de Blob` --references--> `deletePdf()`  [INFERRED]
  PENDIENTE.md → src/core/sync.ts
- `El empuje de despedida cabe en 64 KB` --references--> `autoSync()`  [INFERRED]
  PENDIENTE.md → src/core/sync.ts
- `Codigo de sincronizacion (SYNC_TOKEN)` --references--> `authorized()`  [INFERRED]
  PENDIENTE.md → api/library.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flujo de sincronizacion entre dispositivos (empuje, fusion, tombstones, Blob)** — claude_sincronizacion_updatedat_tombstones, claude_tombstones_de_borrado, claude_texto_extraido_no_se_sube, claude_library_json_sufijo_aleatorio, claude_pdfs_directos_a_blob, readme_sincronizacion_entre_dispositivos, src_core_sync, src_core_merge, api_library, api_file, src_core_storage_applymerged [EXTRACTED 1.00]
- **Puesta en marcha del despliegue en Vercel (pasos manuales del usuario)** — pendiente_despliegue_vercel, pendiente_codigo_de_sincronizacion, pendiente_blob_store, pendiente_redeploy_tras_variables, pendiente_url_publica, pendiente_gasto_de_blob [EXTRACTED 1.00]
- **Correcciones para pantalla tactil y movil** — claude_desbloqueo_audio_ios, readme_pdf_en_pestana_nueva_en_tactil, readme_silenciar_bloques, pendiente_voz_ia_en_iphone, claude_e2e_dos_suites [INFERRED 0.85]
- **Las cuatro fixtures que sostienen las heurísticas de maquetación** — src_core_pdf___fixtures___sample_fixture, src_core_pdf___fixtures___lists_fixture, src_core_pdf___fixtures___lists_flush_fixture, src_core_pdf___fixtures___tables_fixture, src_core_pdf_layout_linestoblocks [EXTRACTED 1.00]
- **Las señales que cierran un bloque, y el caso que rompe cada una** — src_core_pdf___fixtures___lists_sangria_cierra_el_punto, src_core_pdf___fixtures___lists_flush_maqueta_apretada, src_core_pdf___fixtures___lists_flush_hueco_del_propio_grupo, src_core_pdf___fixtures___tables_columnas_alineadas, src_core_pdf___fixtures___tables_superindice_no_parte_parrafo [INFERRED 0.85]
- **Riesgo asimétrico: lo que se calla cuesta más que lo que suena raro** — src_core_pdf___fixtures___tables_riesgo_asimetrico, src_core_pdf___fixtures___tables_columnas_alineadas, src_core_pdf___fixtures___tables_formula_entera_y_en_orden, src_core_pdf___fixtures___tables_nota_al_pie_fuera_del_hilo [INFERRED 0.85]

## Communities (14 total, 0 thin omitted)

### Community 0 - "Extraccion de PDF y sus heuristicas"
Cohesion: 0.06
Nodes (63): Fixtures de PDFs reales, Un fragmento se compara con el mayor de los dos, Riesgo asimetrico: ante la duda, prosa, El texto extraido no se sube, Umbrales verticales calibrados con el propio documento, Formulas dentro de un parrafo, Paginas de indice con puntos de guia, Lista de un solo punto y una sola linea (+55 more)

### Community 1 - "Reproductor, voz y controles"
Cohesion: 0.06
Nodes (54): Desplazamiento animado solo en saltos cortos, Una frase = una SpeechSynthesisUtterance, Voz de IA: una frase = una peticion TTS = un Audio, Decidir la cuota de la voz de IA con uso real, pause/resume nativos ignorados por alguna voz, La voz de IA no resalta la palabra en curso, En el ordenador, abrirlo en Microsoft Edge, Voz de IA (Kokoro via OpenRouter) (+46 more)

### Community 2 - "Lectura: temas, indice y marcadores"
Cohesion: 0.08
Nodes (45): Los tres resaltados se eligen juntos, La estrella del marcador en oro, Atajos de teclado, Barra lateral: indice, buscador y marcadores, Marcadores con notas, Temas Papel y Tinta, Los tres resaltados por modo, Bookmarks() (+37 more)

### Community 3 - "Biblioteca, almacenamiento y sincronizacion"
Cohesion: 0.12
Nodes (44): Cola de escrituras a IndexedDB, Campos nuevos de LibraryEntry se normalizan al leer, La sincronizacion fusiona por updatedAt y borra con tombstones, Tombstones: deleteDoc marca, no borra, Sincronizacion entre dispositivos (opcional), App(), Open, Library() (+36 more)

### Community 4 - "Cadena de lint"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+19 more)

### Community 5 - "Configuracion de TypeScript"
Cohesion: 0.08
Nodes (23): api, DOM, DOM.Iterable, ES2022, node, src, vite/client, compilerOptions (+15 more)

### Community 6 - "Como se trabaja en este proyecto"
Cohesion: 0.11
Nodes (22): Trigger /graphify del proyecto, Repetir los fallos intermitentes tres o cuatro veces, Un 200 en el 5173 no basta, Skill /verify, Comprobaciones en navegador sin esperas fijas, Desbloqueo de audio de iOS solo en tactil, e2e: verify.cjs (escritorio) y mobile.cjs (tactil y sync), Grafo graphify del proyecto (+14 more)

### Community 7 - "Despliegue en Vercel y subida de PDFs"
Cohesion: 0.12
Nodes (20): authorized(), DELETE(), denied(), GET(), idOf(), Arquitectura: todo en el navegador salvo api/, Los PDFs suben directos del navegador a Blob, La portada crece con clamp(), no con el zoom (+12 more)

### Community 8 - "Dependencias y scripts npm"
Cohesion: 0.09
Nodes (21): dependencies, pdfjs-dist, react, react-dom, @vercel/blob, name, private, scripts (+13 more)

### Community 9 - "Fusion de bibliotecas en el servidor"
Cohesion: 0.21
Nodes (13): authorized(), denied(), GET(), PUT(), readRemote(), Convencion de comentarios ponytail:, library.json con sufijo aleatorio nuevo cada vez, Cache de audio de la voz de IA (+5 more)

### Community 10 - "Comprobaciones de escritorio"
Cohesion: 0.15
Nodes (7): { chromium }, fs, path, PDF, results, SHOTS, TABLES_PDF

### Community 11 - "Comprobaciones moviles y de sync"
Cohesion: 0.25
Nodes (10): check(), { chromium, devices }, crypto, fakeSpeech(), fs, mobile(), path, PDF (+2 more)

## Knowledge Gaps
- **99 isolated node(s):** `fs`, `path`, `crypto`, `{ chromium, devices }`, `PDF` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `La sincronizacion fusiona por updatedAt y borra con tombstones` connect `Biblioteca, almacenamiento y sincronizacion` to `Fusion de bibliotecas en el servidor`, `Despliegue en Vercel y subida de PDFs`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `extractDoc()` connect `Extraccion de PDF y sus heuristicas` to `Biblioteca, almacenamiento y sincronizacion`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `linesToBlocks()` (e.g. with `Umbrales verticales calibrados con el propio documento` and `El hueco se compara con el del propio grupo, no con una constante`) actually correct?**
  _`linesToBlocks()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `extractDoc()` (e.g. with `El texto extraido no se sube` and `Riesgo asimétrico de las heurísticas: ante la duda, prosa`) actually correct?**
  _`extractDoc()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `path`, `crypto` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Extraccion de PDF y sus heuristicas` be split into smaller, more focused modules?**
  _Cohesion score 0.06278538812785388 - nodes in this community are weakly interconnected._
- **Should `Reproductor, voz y controles` be split into smaller, more focused modules?**
  _Cohesion score 0.05834464043419267 - nodes in this community are weakly interconnected._