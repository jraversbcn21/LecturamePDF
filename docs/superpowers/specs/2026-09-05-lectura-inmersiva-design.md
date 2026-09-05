# Lectura inmersiva en móvil: las barras se esconden mientras escuchas

Fecha: 2026-09-05. Estado: aprobado.

## Problema

En el móvil, la cabecera y el reproductor ocupan un tercio de la pantalla (captura del iPhone:
cabecera con «Biblioteca», ☰, 📄, nombre e idioma arriba; transporte, velocidad y voz abajo).
Quien escucha sin tocar la pantalla no necesita nada de eso, y el texto que sigue con la vista se
queda en la franja del medio.

## Decisiones tomadas con el usuario

- **El primer toque solo trae las barras, no salta la lectura.** Hoy un toque sobre una frase
  salta a ella (`onJump`). Con las barras ocultas, ese mismo gesto es lo que uno hace para
  pausar o ver por dónde va; si además saltara, cada intento de pausar movería la lectura. Se
  paga un toque extra para saltar cuando están ocultas.

## Comportamiento

- **Solo en táctil** (`matchMedia('(hover: none)')`), la misma regla que el recuadro de
  arrastrar. En escritorio hay sitio de sobra y las barras no molestan.
- **Solo mientras `status === 'playing'`** y con la barra lateral cerrada. Pausar, terminar el
  documento, abrir la barra lateral o dejar la pestaña (`visibilitychange`) las muestran solas.
- **Tras 4 s sin interacción** se esconden la cabecera (`.bar`) y el reproductor (`.controls`).
- **Vuelven** con: el primer toque en cualquier sitio (que se traga), un desplazamiento del
  texto o cualquier tecla (sin tragarse nada). Cualquiera de esas rearma los 4 s.

## Código

- `src/app/components/Reader.tsx`: hook `useImmersive(playing: boolean, enabled: boolean)`
  que devuelve `[hidden, wake]`. Un `useState`, un temporizador (`setTimeout` 4000) que
  `wake()` rearma, y un `useEffect` que sale del modo cuando `playing` o `enabled` dejan de
  ser ciertos. El `div.screen.reading` gana la clase `immersive` cuando `hidden`, y estos
  manejadores: `onClickCapture` (si `hidden`: `wake()` + `stopPropagation()`; si no, nada),
  `onPointerDown` → `wake()` solo si no están ocultas (`pointerdown` llega antes que `click`;
  si revelara, el `click` vería las barras visibles y saltaría), `onTouchMove` → `wake()`.
  **`touchmove`, no `scroll`**: `ReaderView` centra cada frase que suena con `scrollIntoView`,
  y ese scroll programático dispara `scroll` igual que el dedo; escuchando `scroll` el
  temporizador se rearmaba en cada frase y las barras no se escondían nunca (visto en la
  emulación al implementarlo). `enabled` = táctil y barra lateral cerrada. El hook escucha
  `keydown` y `visibilitychange` en `window`/`document` y llama a `wake()`.
- `src/styles.css`: `.bar` y `.controls` con `max-height: 8rem; overflow: hidden;
  transition: max-height 0.25s, transform 0.25s, padding 0.25s`. En `.screen.reading.immersive`
  ambas pasan a `max-height: 0; padding-block: 0; border-width: 0` y `transform`
  `translateY(-100%)` / `translateY(100%)`. Es un reflow: la frase activa se mueve unos 70 px,
  suavizado por la transición; `ReaderView` ya la mantiene a la vista.

## Comprobación (`e2e/mobile.cjs`, emulación táctil)

1. Abrir un documento, dar al play. `waitForSelector('.screen.immersive', { timeout: 8000 })`:
   las barras se esconden solas (no es una espera fija: se espera al estado).
2. Tocar una frase de **otro bloque** que el activo. Comprobar que `.screen.immersive` ya no
   está y que `.sentence.active` **no** es la tocada (el toque se tragó).
3. Caso negativo: abrir la barra lateral (☰) con la lectura en marcha; pasados > 4 s
   (`waitForTimeout(5000)` es aceptable aquí porque se comprueba una *ausencia* estable, no un
   estado que la voz cambia), `.screen.immersive` sigue sin existir.

## Documentación

- `CLAUDE.md`, «Decisiones que no conviene deshacer»: por qué el primer toque se traga y por qué
  solo en táctil.
- `README.md`, «Mientras escuchas»: una frase.

## Fuera de alcance, a propósito

- Escritorio.
- Una tira de progreso visible con las barras ocultas.
- La barra del propio Safari: la esconde iOS al desplazar, y como PWA instalada no existe.
