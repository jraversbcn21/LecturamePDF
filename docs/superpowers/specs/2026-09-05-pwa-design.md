# PWA: arrancar sin conexión e instalarse en la pantalla de inicio

Fecha: 2026-09-05. Estado: aprobado.

## Problema

Los datos ya son offline —PDFs, texto extraído, progreso y marcadores viven en IndexedDB, y la voz
local no toca la red—, pero **la aplicación no carga sin conexión**: no hay service worker y Vercel
sirve todo con `Cache-Control: max-age=0, must-revalidate`, así que en un avión no abre ni la
portada. Solo sobrevive una pestaña ya abierta, y iOS las rehace cuando quiere.

## Decisiones tomadas con el usuario

- **Actualización en el siguiente arranque.** El worker nuevo se descarga en silencio y toma el
  mando cuando se abre la app sin ninguna pestaña vieja viva. Nunca interrumpe una lectura; el
  precio es ir una versión por detrás hasta cerrar. Sin aviso ni botón.
- **Icono propio y sencillo**, en la paleta de la app, sin dependencias nuevas para rasterizarlo.
- **Comprobación e2e contra `vite preview`**, encadenada en `npm run e2e`, para que un cambio en
  la configuración no deje la PWA rota en silencio.

## Enfoque elegido

`vite-plugin-pwa@0.21.2` en modo `generateSW`. Workbox genera el service worker con la lista de
precache a partir del `dist` real, hashes incluidos.

Versión fijada, como Vite 5, pdfjs 4 y Vitest 2: `vite-plugin-pwa@1.x` arrastra
`workbox-build ^7.4.1`, que exige Node ≥ 20, y esta máquina tiene Node 18. La `0.21.2` va con
workbox 7.3 (Node ≥ 16) y soporta Vite 5.

Descartados: service worker a mano (la lista de precache lleva los hashes del build, así que
obligaría a escribir un plugin de Vite y a reimplementar la limpieza de cachés viejas) e
`injectManifest` (solo compensa con lógica de caché a medida, y aquí no la hay).

## Componentes

### 1. Configuración y manifest (`vite.config.ts`)

```ts
VitePWA({
  registerType: 'prompt',
  manifest: {
    name: 'LecturamePDF', short_name: 'Lecturame', lang: 'es',
    display: 'standalone', theme_color: '#faf7f1', background_color: '#faf7f1',
    icons: [192, 512 con purpose 'any maskable'],
  },
  workbox: {
    globPatterns: ['**/*.{js,mjs,css,html,svg,png}'],
    navigateFallbackDenylist: [/^\/api\//],
  },
})
```

Dos líneas que no son opcionales:

- **`mjs` en el glob.** El worker de pdf.js sale del build como `pdf.worker.min-<hash>.mjs`, y el
  patrón por defecto del plugin (`**/*.{js,css,html}`) no lo incluye. Sin él la app arranca sin
  conexión pero no extrae nada.
- **`/api/` en la lista negra del fallback de navegación.** El fallback sirve `index.html` a
  cualquier navegación que no esté en caché; sin la exclusión, una petición a `/api/library` sin
  red recibiría HTML donde se esperaba JSON.

No se activa `devOptions`: bajo `vite dev` no hay service worker, y las suites e2e actuales no
cambian.

### 2. Registro (`src/main.tsx`, `tsconfig.json`)

`registerSW({ immediate: true })` de `virtual:pwa-register`. Con `registerType: 'prompt'` y sin
manejar `onNeedRefresh`, el worker nuevo se instala y **espera a que se cierren todas las
pestañas** antes de activarse: es la actualización en el siguiente arranque, sin código extra.
`tsconfig.json` añade `vite-plugin-pwa/client` a `types` para el módulo virtual.

### 3. Icono (`public/`, `scripts/icons.cjs`, `index.html`)

- `public/icon.svg`: fondo papel `#faf7f1`, marca simple con el acento de la app, con margen
  suficiente para la zona segura de un icono maskable (el 80 % central).
- `scripts/icons.cjs` (~20 líneas, Playwright global): rasteriza el SVG a `public/icon-192.png`,
  `public/icon-512.png` y `public/apple-touch-icon.png` (180 px). Los PNG se versionan; el script
  queda para regenerarlos si cambia el diseño.
- `index.html`: `<link rel="icon" href="/icon.svg">`, `<link rel="apple-touch-icon"
  href="/apple-touch-icon.png">` y `<meta name="theme-color" content="#faf7f1">`. El
  `<link rel="manifest">` lo inyecta el plugin.

### 4. Comprobación (`e2e/pwa.cjs`, `package.json`, skill `/verify`)

Mismo esqueleto que `mobile.cjs` (`check`, `results`, exit 2 si no responde el servidor). Ataca
`LECTURAME_PREVIEW_URL`, por defecto `http://localhost:4173/`, que es `vite preview` sirviendo el
`dist` recién construido. Seis comprobaciones:

1. Abrir la app y esperar a `navigator.serviceWorker.ready` (el precache ocurre en `install`, así
   que al resolverse ya está lleno).
2. El preview sirve LecturamePDF (título de la página): el 4173 puede ser de otro proyecto.
3. El worker `.mjs` de pdf.js está entre las claves de la Cache Storage (`caches.keys()` →
   `cache.keys()`). Se pregunta a la caché directamente porque, visto al implementarlo, en
   Chromium headless la petición del script del Worker **se salta la emulación offline** de
   Playwright: extraer sin red pasa aunque el `.mjs` no esté precacheado, así que no lo demuestra.
4. `context.setOffline(true)` y recargar: aparece la portada (`input[type=file]`, esperado con
   `state: 'attached'` porque está oculto por diseño).
5. Subir `sample.pdf` sin red y llegar a `article.reader`: prueba funcional de la extracción.
6. Navegar a `/api/library` sin red **falla** en vez de devolver HTML.

`npm run e2e` pasa a encadenar tres ficheros: `verify.cjs && mobile.cjs && pwa.cjs`. La skill
`/verify` gana un paso: tras el build, `npx vite preview --port 4173` en segundo plano, y
`LECTURAME_PREVIEW_URL` si el puerto es otro.

### 5. Documentación

- `CLAUDE.md`: la restricción de versión del plugin junto a las de Vite/pdfjs/Vitest, y una
  decisión nueva con las tres reglas (siguiente arranque, `mjs`, `/api/`) y su porqué.
- `README.md`: sección corta «Sin conexión y en la pantalla de inicio»: qué funciona offline, cómo
  instalarla en iOS (Compartir → Añadir a pantalla de inicio) y qué queda fuera por definición
  —voz de IA, voces «Natural» de Edge en escritorio, sincronizar—.
- `PENDIENTE.md`: sale el ítem de la PWA; entra la prueba en dispositivo real: instalar, modo
  avión, y que el PDF original —que en táctil se abre con `window.open`— salta a Safari desde la
  app instalada y al volver la lectura sigue donde estaba.

## Fuera de alcance, a propósito

- Aviso de «hay una versión nueva» o botón de instalar.
- Caché en runtime de PDFs remotos de Blob o del audio de OpenRouter: los PDFs viven en IndexedDB
  y la voz de IA es red por definición.
- `viewport-fit=cover` y `env(safe-area-inset-*)`: en standalone iOS ya inseta la vista; si en el
  dispositivo se ve mal, se añade entonces.

## Riesgos y cómo se cubren

- **Precache sirviendo versiones viejas tras un despliegue.** Workbox versiona cada fichero por
  hash y borra las cachés anteriores al activarse; el `sw.js` lo sirve Vercel con `max-age=0`, así
  que el navegador siempre comprueba si hay worker nuevo. La comprobación (1) falla si el registro
  deja de funcionar; la (3) si el precache pierde el worker de pdf.js.
- **Chromium headless con `setOffline`.** Playwright corta la red a nivel de navegador y deja al
  service worker responder desde caché; es el comportamiento documentado y en el que se apoyan
  las comprobaciones (4) y (5).
- **Compatibilidad de la dependencia.** Fijada a `0.21.2`; `npm run verify` (build) la ejercita en
  cada pasada.
