---
name: verify
description: Verificación completa de Lecturame — tests unitarios, typecheck, build y las comprobaciones de navegador con Playwright. Úsala antes de dar por terminado cualquier cambio, o cuando el usuario pida comprobar que todo sigue bien.
---

Ejecuta las tres comprobaciones en orden y para en la primera que falle, salvo que el usuario
pida el informe completo. La primera es rápida y detecta la mayoría de los fallos.

## 1. Tests unitarios, typecheck y lint

```powershell
npm test; if ($?) { npx tsc --noEmit }; if ($?) { npm run lint }
```

## 2. Servidores

Las comprobaciones de navegador necesitan **dos servidores** arriba: el de desarrollo, para
`verify.cjs` y `mobile.cjs`, y el preview de un build reciente, para `pwa.cjs` —bajo `vite dev`
no hay service worker—.

### Servidor de desarrollo

Atacan `http://localhost:5173` por defecto, pero **un 200 no basta**: el usuario suele tener
otros proyectos servidos en ese puerto (se ha visto), y el e2e se queda esperando un
`input[type=file]` que no existe. Comprueba que lo que responde es **esta** aplicación, mirando
el título:

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

### Build y preview

`pwa.cjs` no corre contra `vite dev` sino contra un `dist` recién construido:

```powershell
npx vite build
npx vite preview --port 4173   # run_in_background: true
```

Igual que el 5173, el 4173 puede estar ocupado por otro proyecto del usuario: comprueba con el
mismo truco (`Invoke-WebRequest` contra el 4173, mirando el título) antes de fiarte, y si no es
`LecturamePDF`, usa otro puerto y pásalo con `LECTURAME_PREVIEW_URL`.

## 3. Comprobaciones en navegador

Playwright está instalado de forma **global**, no como dependencia del proyecto, así que hay que
apuntarle el `NODE_PATH`. Sin esto falla con «Cannot find module 'playwright'». Si algún servidor
no está en su puerto por defecto, apunta el e2e con `LECTURAME_URL` y/o `LECTURAME_PREVIEW_URL`:

```powershell
$env:NODE_PATH = (npm root -g); $env:LECTURAME_URL = 'http://localhost:5174/'; $env:LECTURAME_PREVIEW_URL = 'http://localhost:4201/'; npm run e2e
```

Son **tres suites encadenadas** y cada una da su propio recuento: `verify.cjs` (escritorio),
`mobile.cjs` (emulación táctil y cliente de sincronización) y `pwa.cjs` (sin conexión, contra el
preview). Si una falla, la siguiente ni se lanza, así que no des por buena una parte sin ver su
línea final. Si falta alguno de los dos servidores, la suite que lo necesita sale con código 2 y
un mensaje que dice cuál arrancar.

Si un fallo parece intermitente, repítelo tres o cuatro veces antes de darlo por bueno o por
malo: varias carreras de esta suite solo aparecían en una de cada cuatro pasadas.

Antes de tocar el código por un fallo aquí, descarta que el problema esté en la comprobación:
lo más habitual es medir el estado mientras la voz sigue avanzando. Ver la sección
«Comprobaciones en navegador» de CLAUDE.md.

## Informe

Di en una línea qué pasó con cada bloque, con los números reales (cuántos tests, cuántas
comprobaciones). Si algo falló, cita la salida; no lo resumas como «un fallo menor».
