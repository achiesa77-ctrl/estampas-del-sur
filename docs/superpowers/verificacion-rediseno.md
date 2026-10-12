# Verificación final del rediseño documental

Fecha: 2026-10-11 · Rama: `rediseno-documental` · Spec: `specs/2026-10-09-rediseno-documental-design.md`

## Resultado por criterio de éxito (spec §1)

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Sin estética fogón/coral | Cumple | Paleta sólo por tokens B/N + oro; Archivo + Newsreader; sin brasas, haces, piedra ni intro de video. |
| 2 | Fotos como una serie B/N | Cumple | Gradadas en build (Tarea 3); revisadas en las capturas de cada sección. |
| 3 | Portada: hoja de contactos completa, y estático con movimiento reducido | Cumple | Cuadros `?t=0`, `?t=2`, `?t=3.4`, `?t=fin` revisados a 1440 y 390; `portada.spec.ts`. |
| 4 | Todo el contenido presente con datos corregidos | Cumple | Una sección por componente, sin stubs; tests por sección. |
| 5 | Contraste AA, foco visible, áreas táctiles ≥ 44 px | Cumple (ver nota sobre ambientes) | `a11y.spec.ts`: foco visible en todo el recorrido con Tab, `alt` en toda `<img>`, ≥ 44×44 en móvil, sin scroll horizontal a 390 px. |
| 6 | Bytes ≤ ~1.9 MB y LCP < 2.5 s en 4G | Bytes: cumple. LCP: cumple en móvil; en escritorio 5.4 s, **aceptado por el usuario** (2026-10-11) | Ver «Rendimiento». |
| 7 | `npm run build` sin errores y Netlify publicando `dist/` | Cumple | `netlify.toml` publica `dist/` y ahora fija `NODE_VERSION = "22"` (Astro 7 exige ≥ 22.12). |

## Batería

- `astro check`: 0 errores, 0 advertencias, 0 sugerencias.
- Vitest: 40/40.
- Playwright: 191 que pasan, 0 que fallan (dos corridas completas seguidas). Los salteados son casos de escritorio en el proyecto móvil y viceversa.

## Rendimiento (Chrome, red simulada por CDP: 9 Mbps, 170 ms; caché desactivada; sin scroll)

Los dos sitios servidos con el mismo `ThreadingHTTPServer`; `main` desde un worktree de la rama `main`.

| | Bytes carga inicial | LCP (3 corridas) |
|---|---|---|
| Rediseño, escritorio 1440 | 813 KB | 5452 / 5428 / 5416 ms |
| `main`, escritorio 1440 | 3134 KB | 1052 / 848 / 840 ms |
| Rediseño, móvil 390 | 808 KB | 1108 / 1108 / 1140 ms |
| `main`, móvil 390 | 3134 KB | 5140 / 840 / 840 ms |

**Bytes: −74 %** (3134 → ~810 KB). El intro en video de `main` (2.1 MB) ya no existe.

### LCP de escritorio: por qué da 5.4 s

No es la red: la foto elegida termina de bajar a los **622 ms** (58 KB, AVIF, precargada con `fetchpriority="high"`).
Línea de tiempo medida:

- ~1.1 s: la hoja de contactos ya está en pantalla (LCP provisorio: una miniatura).
- ~1.5 s: la foto elegida se pinta en la hoja. No cuenta como LCP: mide lo mismo que las otras miniaturas.
- ~3.3 s: el zoom la lleva a pantalla completa. Un `transform` no genera una entrada LCP nueva.
- 5.42 s: la portada pasa a `data-estado="final"`; 30 ms después Chrome **vuelve a registrar la misma foto** como LCP, ya a pantalla completa.

En móvil no pasa (no hay pin), por eso da 1.1 s.

Hipótesis descartadas con experimentos aislados: crear el pin al final (se probó crearlo al inicio), el `ScrollTrigger.refresh()` de `crearScroll()` (se quitó), la creación del ScrollTrigger de salida (se desactivó), liberar el `overflow` de `<html>` y quitar `lenis-stopped`. Ninguno lo movió. Los cambios de prueba se revirtieron: no se dejó nada no probado en la portada.

**Lo que ve una persona** no cambia: contenido a ~1.1 s y foto a pantalla completa a ~3.3 s, por diseño de la coreografía aprobada (≤ 4.5 s). Lo que no cumple es la **métrica** tal como la reporta Chrome.

**Decisión (2026-10-11):** el usuario acepta el LCP de escritorio así documentado; no se acorta la coreografía ni se sigue investigando por ahora.

## Problemas encontrados y corregidos en esta verificación

1. **Cruce de ambientes ilegible** (`ambientes.ts`). El fundido papel ↔ oscuro se hacía en el `<body>`, con las secciones transparentes y el texto de cada sección con color fijo. A mitad de camino quedaba un gris donde ningún texto llegaba a AA. Con «Próximas fechas» arriba de la pantalla (sección corta) ese gris era justo la posición de lectura; en móvil el título «GALERÍA» quedaba casi invisible.
   **Arreglo:** la sección que **entra** funde su propio fondo y su texto desde el ambiente anterior; la que se está leyendo conserva siempre su fondo opaco. Test nuevo: `ambientes.spec.ts`.
2. **Cifras de «El Grupo» en «0»**. Arrancaban a contar al cruzar el 85 % de la pantalla; entre el borde inferior y esa línea se veía «0 años en escena», un dato falso. **Arreglo:** arrancan apenas asoman (`top bottom`). Test nuevo en `grupo.spec.ts`.
3. **Test intermitente de anclaje** (`trayectoria.spec.ts`, «desde el pie de página»). Era del test: un único `scrollBy` para hacer reaparecer el nav; ahora sube con la rueda hasta verlo.

## Checklist de entrega

- `dist/` incluye `repertorio/` (3 audios), `og/` (`portada-hd.jpg`, `logo-nuevo.jpg`) y el favicon; todas las rutas referenciadas por `index.html` existen.
- `og:image` con URL absoluta a `https://estampasdelsur.netlify.app/og/portada-hd.jpg`.

## Pendiente

- Fechas reales de agenda (fuera de alcance, spec §9).
- Foto original del disco (621×470) para mejorar nitidez (spec §9).
