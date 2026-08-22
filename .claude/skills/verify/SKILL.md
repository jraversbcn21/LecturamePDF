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

Las comprobaciones de navegador atacan `http://localhost:5173` por defecto, pero **un 200 no
basta**: el usuario suele tener otros proyectos servidos en ese puerto (se ha visto), y el e2e
se queda esperando un `input[type=file]` que no existe. Comprueba que lo que responde es
**esta** aplicación, mirando el título:

```powershell
$ErrorActionPreference = 'SilentlyContinue'
$body = (Invoke-WebRequest http://localhost:5173/ -UseBasicParsing).Content
if ($body -match 'LecturamePDF') { "servidor ya levantado en 5173" }
elseif ($body) { "el 5173 lo ocupa OTRA aplicacion: arrancar en otro puerto" }
else { "hay que arrancarlo" }
```

Si hay que arrancarlo, `npm run dev` en segundo plano (`run_in_background: true`) y espera a que
responda. Vite coge el primer puerto libre (5174 si el 5173 está ocupado): lee el puerto real de
su salida y pásalo al e2e con `LECTURAME_URL`. Si lo arrancas tú, déjalo corriendo al terminar y
dilo en el resumen; no lo mates, que el usuario suele estar usándolo.

## 3. Comprobaciones en navegador

Playwright está instalado de forma **global**, no como dependencia del proyecto, así que hay que
apuntarle el `NODE_PATH`. Sin esto falla con «Cannot find module 'playwright'». Si el servidor
no está en el 5173, apunta el e2e con `LECTURAME_URL`:

```powershell
$env:NODE_PATH = (npm root -g); $env:LECTURAME_URL = 'http://localhost:5174/'; npm run e2e
```

Son **dos suites encadenadas** y cada una da su propio recuento: `verify.cjs` (escritorio) y
`mobile.cjs` (emulación táctil y cliente de sincronización). Si la primera falla, la segunda ni
se lanza, así que no des por buena la parte móvil sin ver su línea final.

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
