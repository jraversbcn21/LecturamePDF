---
name: verify
description: Verificación completa de Lecturame — tests unitarios, typecheck, build y las comprobaciones de navegador con Playwright. Úsala antes de dar por terminado cualquier cambio, o cuando el usuario pida comprobar que todo sigue bien.
---

Ejecuta las cuatro comprobaciones en orden y para en la primera que falle, salvo que el usuario
pida el informe completo. Las dos primeras son rápidas y detectan la mayoría de los fallos.

## 1. Tests unitarios, typecheck y lint

```powershell
npm test; if ($?) { npx tsc --noEmit }; if ($?) { npm run lint }
```

## 2. Servidor de desarrollo

Las comprobaciones de navegador atacan `http://localhost:5173`. Mira si ya está levantado antes
de arrancar otro:

```powershell
$ErrorActionPreference = 'SilentlyContinue'
$up = (Invoke-WebRequest http://localhost:5173/ -UseBasicParsing).StatusCode -eq 200
if ($up) { "servidor ya levantado" } else { "hay que arrancarlo" }
```

Si no lo está, arráncalo en segundo plano con `npm run dev` (`run_in_background: true`) y espera
a que responda antes de seguir. Si lo arrancas tú, déjalo corriendo al terminar y dilo en el
resumen; no lo mates, que el usuario suele estar usándolo.

## 3. Comprobaciones en navegador

Playwright está instalado de forma **global**, no como dependencia del proyecto, así que hay que
apuntarle el `NODE_PATH`. Sin esto falla con «Cannot find module 'playwright'»:

```powershell
$env:NODE_PATH = (npm root -g); npm run e2e
```

Si un fallo parece intermitente, repítelo tres o cuatro veces antes de darlo por bueno o por
malo: varias carreras de esta suite solo aparecían en una de cada cuatro pasadas.

Antes de tocar el código por un fallo aquí, descarta que el problema esté en la comprobación:
lo más habitual es medir el estado mientras la voz sigue avanzando. Ver la sección
«Comprobaciones en navegador» de CLAUDE.md.

## 4. Build

```powershell
npx vite build
```

## Informe

Di en una línea qué pasó con cada bloque, con los números reales (cuántos tests, cuántas
comprobaciones). Si algo falló, cita la salida; no lo resumas como «un fallo menor».
