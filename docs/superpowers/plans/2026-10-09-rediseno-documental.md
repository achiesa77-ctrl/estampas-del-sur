# Rediseño documental — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer el sitio de Estampas del Sur como documental en blanco y negro (hoja de contactos → zoom en la portada, ambientes cuarto oscuro/papel) migrado a Astro.

**Architecture:** Sitio estático Astro de una página. El contenido vive en `src/data/*.ts`, cada sección es un componente `.astro`, y cada comportamiento es un módulo `src/scripts/*.ts` que exporta `init()` y usa el reloj/medios compartidos de `motion.ts`. Las fotos se gradúan a B/N una vez con Pillow y Astro las optimiza.

**Tech Stack:** Astro 5, TypeScript, GSAP 3.15 (ScrollTrigger, SplitText, Flip), Lenis 1.3, @fontsource-variable (Archivo, Newsreader). Dev: Vitest, Playwright (usando el Chrome instalado, `channel: "chrome"`), Python + Pillow.

**Spec:** `docs/superpowers/specs/2026-10-09-rediseno-documental-design.md`

## Global Constraints

- Todo en la rama `rediseno-documental`; no tocar `main` ni pushear sin pedido del usuario.
- Dependencias de runtime: sólo `astro`, `gsap`, `lenis`, `@fontsource-variable/archivo`, `@fontsource-variable/newsreader`. De desarrollo: `vitest`, `@playwright/test`, `@astrojs/check`, `typescript`.
- Colores sólo vía tokens: `--oscuro #121110`, `--papel #E8E2D5`, `--tinta #1C1A17`, `--plata #9A948A`, `--lapiz #5C574F`, `--oro #D4AE55`, `--oro-viejo #7A5D1C`. `--plata` y `--oro` nunca como texto sobre papel.
- Tipografía: Archivo (títulos `wdth 125 / wght 850` mayúsculas; datos `wdth 72 / wght 500–700`), Newsreader (cuerpo 18px/1.6, máx 65ch; itálica para epígrafes). Escala 18·24·32·42·56 + título de portada `clamp` hasta ~160px.
- Animar sólo `transform`/`opacity` (excepciones: `clip-path` en máscaras de texto, fondo en `ambientes.ts`). Sin `transition: all`, sin glow, sin gradientes decorativos.
- Pins y travellings horizontales sólo con `(min-width: 900px) and (prefers-reduced-motion: no-preference)`.
- Con `prefers-reduced-motion: reduce`: sin Lenis, sin pins, sin zoom, sin grano animado; fundidos ≤ 200ms.
- Sin JS todo el contenido es visible (el estado por defecto del HTML/CSS es el estado final).
- Copia en español rioplatense, sentence case; datos sólo de spec §7; no inventar citas ni testimonios.
- Textos e imágenes actuales se migran desde `git show main:index.html` (líneas de referencia en cada tarea).
- Commits en español, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Scroll/tecla durante la secuencia de la portada → salta al estado final, nunca queda a medio zoom ni con el scroll bloqueado (test en Task 6).
2. Redimensionar la ventana cruzando 900px con pins activos → pins se crean/revierten sin dejar huecos ni contenido desplazado (test en Task 8).
3. Enlace del menú hacia una sección con pin (Integrantes, Trayectoria) → aterriza en el inicio de la sección con el título visible (test en Task 13).
4. Archivo de audio que no carga → la fila muestra error y no queda marcada como reproduciendo (test en Task 10).
5. Visor de galería con teclado → Escape cierra y el foco vuelve a la miniatura que lo abrió (test en Task 14).

---

### Task 1: Andamiaje Astro + herramientas de prueba

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `src/pages/index.astro`, `tests/e2e/smoke.spec.ts`
- Create: `public/` con `repertorio/` (mover), `favicon` y `og/portada-hd.jpg` (copia color), `og/logo-nuevo.jpg`
- Modify: `netlify.toml` (`command = "npm run build"`, `publish = "dist"`), `.gitignore` (`node_modules/`, `dist/`, `.astro/`, `test-results/`, `playwright-report/`)
- Delete: `index.html`, `styles.css`, `script.js` (quedan en el historial de `main`)

**Interfaces:**
- Produces: scripts npm `dev`, `build`, `preview`, `check` (`astro check`), `test` (`vitest run`), `e2e` (`playwright test`). Playwright levanta `npm run preview` en `http://localhost:4321` y usa `channel: "chrome"`, proyectos `desktop` (1440×900) y `mobile` (390×844).

- [ ] **Step 1:** Instalar dependencias exactas de Global Constraints; `npx playwright install` NO hace falta (usa Chrome del sistema).
- [ ] **Step 2: Test que falla** — `tests/e2e/smoke.spec.ts`: `page.goto("/")` → `expect(page).toHaveTitle(/Estampas del Sur/)` y cero mensajes `console.error`.
- [ ] **Step 3:** Run `npm run build && npm run e2e` → FAIL (index sin título).
- [ ] **Step 4:** `index.astro` mínimo con `<title>Estampas del Sur — Folklore uruguayo desde Pando</title>`.
- [ ] **Step 5:** Run `npm run build && npm run e2e` → PASS en ambos proyectos.
- [ ] **Step 6:** Commit `Andamiaje Astro, Vitest y Playwright`.

### Task 2: Capa de datos

**Files:**
- Create: `src/data/{grupo,integrantes,trayectoria,temas,videos,credenciales,redes,fechas}.ts`, `src/data/tipos.ts`, `tests/unit/datos.test.ts`

**Interfaces:**
- Produces (todos `export const`, tipos en `tipos.ts`):
  - `grupo: { nombre: "Estampas del Sur"; ciudad: "Pando"; departamento: "Canelones"; fundacion: 2011; presentacion: string[]; cifras: {valor:number; etiqueta:string}[]; ritmos: string[]; historia: string[] }`
  - `integrantes: Integrante[]` — `{ nombre; rol; foto: string /* slug en src/assets/fotos/bn */; alt }`
  - `trayectoria: Hito[]` — `{ anio:number; titulo; texto }`
  - `temas: Tema[]` — `{ titulo; archivo: string /* ruta pública */; duracion: string }`
  - `videos: Video[]` — `{ id; titulo; anio? }`
  - `credenciales: {titulo; anio}[]`, `redes: { instagram; facebook; whatsapp: {numero:"095 871 148"; url:"https://wa.me/59895871148"}; mail:"estampasdelsur23@gmail.com" }`, `fechas: Fecha[]` (vacío)
- Fuentes: presentación y cifras `main:index.html:290-339`; integrantes `342-445`; historia `448-487`; temas `506-556`; videos `636-700` (IDs `FTPrXeWkYpg`, `-ab0KSnYS4E`, `AmP6PfhJaIw`, en ese orden y con sus títulos); trayectoria `713-750`; credenciales `268-287`; redes footer `923-954`.

- [ ] **Step 1: Test que falla** — `datos.test.ts` afirma: `grupo.fundacion === 2011` y `grupo.ciudad === "Pando"`; `integrantes.map(i=>i.nombre)` igual a `["Guillermo Pérez","Marcelo Marrero","Fernando Saavedra","Henry Acuña","Diego Rodríguez"]` en el orden de `main`; `trayectoria.map(h=>h.anio)` = `[2011,2016,2017,2018,2019,2020,2022,2024,2026]`; el hito 2017 contiene `"Primer premio"` y `"segundo premio"`; `temas.map(t=>t.titulo)` = `["Oficios","Soy Uruguayo","La Refalosa"]`; `videos.length === 3`; `cifras` = 15/3/4; ningún string de los datos contiene `"Empalme Olmos"` salvo el hito 2017 ni `"2010"`.
- [ ] **Step 2:** Run `npm test` → FAIL (módulos no existen).
- [ ] **Step 3:** Escribir los archivos de datos copiando el texto real de `main`.
- [ ] **Step 4:** Run `npm test` → PASS.
- [ ] **Step 5:** Commit `Datos del grupo en src/data`.

### Task 3: Fotos graduadas a blanco y negro

**Files:**
- Create: `scripts/graduar-bn.py`, `scripts/bn-ajustes.json`, `src/assets/fotos/bn/*.jpg`, `tests/unit/fotos.test.ts`

**Interfaces:**
- Produces: un JPG B/N (q92, lado largo ≤ 2400px, sin agrandar) por slug: `portada` (de `fotos/portada-hd.jpg`), `hero-franja`, `acordeon`, `g1`…`g9` (de `fotos/gal/`), los 5 retratos (`guillermo-perez`, `marcelo-marrero`, `fernando-saavedra`, `henry-acuna`, `diego-rodriguez` — fuente de mayor resolución en `musicos/Nueva carpeta/` si existe, si no `fotos/`), `disco-soy-uruguayo` (se mantiene en COLOR, se copia a `src/assets/fotos/`).
- `bn-ajustes.json`: por slug `{ "mezcla":[r,g,b], "contraste":float, "negro":int, "blanco":int }`; default `[0.30,0.59,0.11]`, `1.25`, `12`, `245`. Para las fotos de escenario violeta/verde/rojo (g2, g8, g9, portada, hero-franja) bajar el canal dominante en la mezcla hasta que caras y guitarras queden separadas del fondo.
- Hoja de contactos de la portada (orden fijo, la elegida en posición 6): `g2, g3, g4, g8, g9, portada, hero-franja, acordeon`.

- [ ] **Step 1: Test que falla** — `fotos.test.ts`: para cada slug esperado existe el archivo; con `sharp` (lo trae Astro) leer stats y afirmar que los tres canales son iguales (`channels` medias con diferencia < 1) salvo `disco-soy-uruguayo`.
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3:** `graduar-bn.py`: mezcla de canales → curva por puntos negro/blanco → contraste alrededor de 128 → guarda RGB con canales iguales. Correr `python scripts/graduar-bn.py`.
- [ ] **Step 4:** Generar hoja de control (`scratchpad`) con todas las B/N y revisarla visualmente; ajustar `bn-ajustes.json` hasta que se lean como una serie (sin fondos empastados ni caras quemadas).
- [ ] **Step 5:** Run `npm test` → PASS. Commit `Fotos graduadas a blanco y negro`.

### Task 4: Layout base, tokens, tipografía, grano y SEO

**Files:**
- Create: `src/layouts/Base.astro`, `src/styles/tokens.css`, `src/styles/base.css`, `src/components/Grano.astro`, `tests/unit/contraste.test.ts`, `tests/e2e/seo.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces: `<Base title description>` con slot; clases utilitarias `.ambiente-oscuro`, `.ambiente-papel` (fondo + color de texto + color de foco), `.titulo` (Archivo display), `.dato` (Archivo condensada), `.epigrafe` (Newsreader itálica), `.medida` (max-width 65ch), `.sr-only`; z-index en `:root`: `--z-grano 1`, `--z-nav 50`, `--z-visor 80`, `--z-salto 100`. `section[id]{scroll-margin-top: var(--nav-h)}` con `--nav-h: 72px` (móvil 60px).
- Head migrado de `main:index.html:3-114`: meta description (Pando), canonical `https://estampasdelsur.netlify.app/`, OG/Twitter con `og:image` absoluta a `/og/portada-hd.jpg` + width/height, JSON-LD `MusicGroup` actualizado (`foundingDate 2011`, `foundingLocation` Pando, álbum «Soy Uruguayo» `datePublished 2026-07-24`), preload de los dos woff2 usados en la portada.

- [ ] **Step 1: Tests que fallan** — `contraste.test.ts` parsea `tokens.css` y afirma ratio WCAG ≥ 4.5 para: papel/oscuro, tinta/papel, plata/oscuro, lapiz/papel, oro/oscuro, oro-viejo/papel, oscuro sobre oro (texto de CTA). `seo.spec.ts`: el JSON-LD parsea y `name === "Estampas del Sur"`; `og:image` empieza con `https://`; existe enlace «Ir al contenido» que al Tab es el primer foco y apunta a `#contenido`.
- [ ] **Step 2:** Run `npm test && npm run build && npm run e2e` → FAIL.
- [ ] **Step 3:** Implementar Base, tokens, base.css (reset, escala, foco `outline 2px` en `--oro`/`--oro-viejo` según ambiente con `outline-offset 3px`, estados de botón `.boton` primario oro/oscuro y secundario con filete) y Grano (SVG feTurbulence, `position:fixed`, `pointer-events:none`, opacidad .08, animación `steps(3)`, quieta con reduced-motion).
- [ ] **Step 4:** Run → PASS. Commit `Layout base, tokens y SEO`.

### Task 5: Motor de movimiento y navegación

**Files:**
- Create: `src/scripts/motion.ts`, `src/scripts/nav.ts`, `src/components/Nav.astro`, `tests/e2e/nav.spec.ts`
- Modify: `src/pages/index.astro` (único `<script>` que importa y llama los `init`)

**Interfaces:**
- Produces (`motion.ts`):
  - `export const mm: gsap.MatchMedia` creado con condiciones `{ motionOK: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)", ancho: "(min-width: 900px)" }`.
  - `export function initMotion(): void` — registra ScrollTrigger, SplitText, Flip; si `motionOK` crea Lenis con `gsap.ticker.add(t=>lenis.raf(t*1000))`, `lagSmoothing(0)`, `lenis.on("scroll", ScrollTrigger.update)`; lo destruye al revertir.
  - `export function scrollA(destino: Element): void` — `lenis.scrollTo(destino)` sin offset o `scrollIntoView` nativo; luego `tabindex="-1"` + `focus({preventScroll:true})`.
  - `export function pausarScroll(): void` / `reanudarScroll(): void` — `lenis.stop/start` + `overflow:hidden` en `html`.
  - `export const reduceMotion = (): boolean`.
- Produces (`nav.ts`): `initNav(): void` — anclajes con `preventDefault` → `scrollA`; ocultar al bajar / mostrar al subir (clase `nav--oculta`, umbral 8px, nunca oculta con el menú abierto o con foco dentro); scrollspy con `aria-current="true"`; menú móvil (`aria-expanded`, Escape cierra y devuelve foco al botón, `pausarScroll` mientras está abierto).
- `Nav.astro`: emblema `logo-nuevo` (color, 44px, enlace a `#inicio`), 10 enlaces (El Grupo, Integrantes, Historia, Repertorio, El Disco, Videos, Trayectoria, Próximas fechas, Galería) + CTA «Contrataciones» → `#contacto`; desde < 1100px, botón «Menú».

- [ ] **Step 1: Tests que fallan** — `nav.spec.ts`: clic en «Historia» → tras 1.5s `#historia` tiene `top` entre 0 y 80px y es `document.activeElement`; en móvil, «Menú» → `aria-expanded="true"`, `html` tiene clase `lenis-stopped` (o `overflow:hidden` con reduced-motion), Escape → `aria-expanded="false"` y foco en el botón; con `reducedMotion: "reduce"` no existe la clase `lenis` en `html`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `Motor de movimiento (Lenis+GSAP) y navegación`.

### Task 6: Portada — hoja de contactos y zoom

**Files:**
- Create: `src/components/Portada.astro`, `src/components/Lapiz.astro`, `src/scripts/portada.ts`, `tests/e2e/portada.spec.ts`

**Interfaces:**
- Consumes: `mm`, `pausarScroll`, `reanudarScroll` (Task 5); fotos de la hoja (Task 3); `grupo`, `credenciales` (Task 2).
- Produces: `initPortada(): gsap.core.Timeline | null`; `window.__portada` = timeline (para el arnés); atributo `data-estado="final"` en `.portada` al terminar o saltar.
- `Lapiz.astro`: props `{ forma: "circulo" | "subrayado"; clase? }`, SVG con un `<path pathLength="1">` trazo a mano alzada `stroke: var(--oro)`, `stroke-width` 3, `fill:none`.
- Marcado: `.portada` (100svh) > `.hoja` (grilla 4×2 escritorio / 2×4 móvil, `<Picture>` por foto, alt vacío salvo la elegida) + `.hoja__elegida` con `<Lapiz forma="circulo">`; `.portada__titulo` `<h1>` «Estampas del Sur» (dos líneas), bajada «Folklore uruguayo desde Pando, Canelones», botones «Contratar al grupo» (`#contacto`) y «Escuchar» (`#repertorio`), lista de credenciales.
- CSS por defecto = **estado final**: la foto elegida a pantalla completa (`position:absolute; inset:0`) y la hoja oculta. JS (si `motionOK`) pone `data-estado="inicio"` y arma el timeline; la foto elegida es el LCP (`loading="eager"`, `fetchpriority="high"`, preload en head).
- Timeline (segundos, ease `expo.out` salvo indicado): 0–1.2 aparecen las 8 fotos (stagger .1, opacidad 0→1 + capa de exposición encima 1→0); 1.2–2.0 trazo del círculo (`strokeDashoffset 1→0`, `power2.inOut`); 2.0–3.4 zoom: la hoja hace `x/y/scale` (calculado con `getBoundingClientRect` de la elegida vs viewport) hasta que la elegida cubre el viewport, las otras `opacity .15`, el círculo se desvanece; 3.4–4.4 título por líneas (SplitText `type:"lines", mask:"lines"`, `yPercent 100→0`, stagger .12), bajada, botones, credenciales.
- Saltar: cualquier `wheel`/`touchmove`/`keydown` durante la entrada → `tl.progress(1)`; `pausarScroll` durante la entrada, `reanudarScroll` en `onComplete`.
- Scroll (sólo `motionOK`, creado en `onComplete`, `immediateRender:false`): pin de `.portada` `end:"+=100%"`, scrub 1 — inverso del zoom (vuelve a la hoja) y la hoja sale con `yPercent -30` + opacidad. Con `ancho` falso (móvil) sin pin: sólo la foto se desplaza `yPercent 15` en scrub.
- Arnés: `?t=N` → `tl.pause().seek(N)`; `?t=fin` → `progress(1)`.

- [ ] **Step 1: Tests que fallan** — `portada.spec.ts`: (a) `?t=fin`: `h1` visible con texto «Estampas del Sur», `.portada[data-estado=final]`; (b) `reducedMotion:"reduce"`: sin esperar, `h1` visible, la imagen elegida cubre el viewport (`boundingBox` ≥ 95% del ancho), no existe `.pin-spacer`; (c) JS deshabilitado (`javaScriptEnabled:false`): `h1` visible; (d) Review Focus 1: cargar `/`, a los 500ms `mouse.wheel(0,400)` → en ≤ 300ms `data-estado="final"` y a 1.5s `scrollY > 0`; (e) existe `<link rel="preload" as="image">` que apunta al mismo archivo que la `<img>` elegida.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementar. **Step 4:** Run → PASS.
- [ ] **Step 5:** Capturas con `?t=0`, `?t=1.6`, `?t=2.7`, `?t=fin` en 1440 y 390; revisar recortes, saltos y FOUC de fuentes. Ajustar.
- [ ] **Step 6:** Commit `Portada: hoja de contactos, lápiz dorado y zoom`.

### Task 7: Ambientes, El Grupo y revelado

**Files:**
- Create: `src/scripts/ambientes.ts`, `src/scripts/revelado.ts`, `src/components/Grupo.astro`, `tests/e2e/grupo.spec.ts`

**Interfaces:**
- Produces: `initAmbientes(): void` — cada `section[data-ambiente="oscuro"|"papel"]`; con `motionOK`, ScrollTrigger por frontera (`start:"top 60%"`, `end:"top 20%"`, scrub) que interpola `background-color` y `color` de `body` entre tokens; con reduce, cambio por clase en `body` con transición 150ms. Sin JS cada sección pinta su propio fondo (default CSS).
- `initRevelado(): void` — (1) `[data-revelar="lineas"]`: SplitText por líneas, color `--lapiz`→`--tinta` por línea con scrub (`start:"top 80%"`, `end:"bottom 55%"`); reduce: color final directo. (2) `[data-contador]`: cuenta 0→valor en 1.2s al entrar (`once`), formato con dígitos tabulares y prefijo de cuadro (`font-variant-numeric: tabular-nums`). (3) `[data-revelar="simple"]`: `ScrollTrigger.batch` opacidad 0→1 + `y 24→0`, 600ms; reduce: sólo opacidad 150ms.
- `Grupo.astro` (papel): título «El grupo», `presentacion` con `data-revelar="lineas"`, tres cifras con `data-contador`, ritmos como lista en línea.

- [ ] **Step 1: Test que falla** — `grupo.spec.ts`: tras scrollear a `#grupo` y esperar 2s, las tres cifras muestran `15`, `3`, `4`; con reduce el `body` termina con el fondo `rgb(232, 226, 213)` estando `#grupo` en pantalla.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Ambientes oscuro/papel y sección El Grupo`.

### Task 8: Integrantes — travelling horizontal

**Files:**
- Create: `src/components/Integrantes.astro`, `src/scripts/integrantes.ts`, `tests/e2e/integrantes.spec.ts`

**Interfaces:**
- Consumes: `mm` (condición `motionOK && ancho`), `integrantes`, `redes`.
- Produces: `initIntegrantes(): void`.
- Marcado (oscuro): título «Integrantes», `<ol class="elenco">` con 5 `<li class="musico">` (retrato `<Picture>` B/N, nombre en `.titulo` gigante, rol en `.dato`, enlaces IG/FB con `aria-label` «Instagram de Estampas del Sur»). Por defecto: columna vertical (lo que ve móvil/reduce/sin JS).
- Con `motionOK && ancho`: `.elenco` pasa a fila (`display:flex`, cada músico 100vw) y un tween `x: -(scrollWidth - innerWidth)` con pin de la sección, `scrub 1`, `end: "+=" + distancia`, `invalidateOnRefresh:true`; cada retrato hace un acercamiento leve (`scale 1.08→1`) con `containerAnimation`.

- [ ] **Step 1: Tests que fallan** — escritorio: tras scrollear dentro del pin, el 3.er músico queda con `boundingBox.x` dentro del viewport; móvil: los 5 `li` apilados (`x` igual) y sin `.pin-spacer`; Review Focus 2: en escritorio con el pin activo `setViewportSize(800,900)` → esperar 500ms → no hay `.pin-spacer` de integrantes, el `ol` está en columna y la altura de `#integrantes` < 5×900; volver a 1440 → el pin se recrea.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Integrantes con travelling horizontal`.

### Task 9: Historia y Agenda

**Files:**
- Create: `src/components/Historia.astro`, `src/components/Agenda.astro`, `tests/e2e/historia-agenda.spec.ts`
- Modify: `src/scripts/revelado.ts` (añade `[data-revelar="copia"]`)

**Interfaces:**
- Consumes: `grupo.historia`, `fechas`, `redes`, `initRevelado`.
- Historia (papel): cabezal editorial a la izquierda, primer párrafo con capitular (`::first-letter`, Archivo 850), 2–3 copias impresas (`g3`, `g4`, `g8`) intercaladas como `<figure class="copia" data-revelar="copia">` con `<figcaption class="epigrafe">` descriptivo y rotación fija (−1.5°, 1°, −0.8°). `copia`: entra con `y -40→0`, `rotation +4°→fija`, y «hace foco» con una capa superior de opacidad 1→0 (no `filter: blur`); reduce: opacidad.
- Agenda (papel, `section--compacta`): si `fechas.length === 0`, texto «No hay fechas anunciadas en este momento.» + «Para contratar o consultar por una fecha, escribinos.» + botones «Escribir por WhatsApp» y «Ver Instagram»; si hay fechas, `<ul>` con fecha (`time datetime`), lugar y ciudad.

- [ ] **Step 1: Test que falla** — `#agenda` contiene «No hay fechas anunciadas» y un enlace a `https://wa.me/59895871148`; `#historia` tiene ≥ 2 `figure` con `figcaption` no vacío.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Historia con copias impresas y agenda`.

### Task 10: Repertorio — reproductor

**Files:**
- Create: `src/components/Repertorio.astro`, `src/scripts/reproductor.ts`, `src/scripts/formato.ts`, `tests/unit/formato.test.ts`, `tests/e2e/repertorio.spec.ts`

**Interfaces:**
- Produces: `formatoTiempo(segundos: number): string` (`"3:38"`; `NaN`/`≤0`/`Infinity` → `"--:--"`); `initReproductor(): void`.
- Marcado (oscuro): `<ol class="temas">` con un `<li>` por tema: número, `<button class="tema__play" aria-label="Reproducir Oficios" aria-pressed="false">` con SVG de dos `path` (play/pausa), título, duración (`data.duracion` como valor inicial), barra de progreso como `<input type="range" aria-label="Posición en Oficios">` con fondo de tira de película (perforaciones con `repeating-linear-gradient` estático: es textura, no decoración degradada). Un solo `<audio preload="none">` compartido. Sin JS: cada `li` incluye `<audio controls preload="none">` dentro de `<noscript>`.
- Comportamiento (portar la lógica de `main:script.js:489-648`): suena uno a la vez; clic en otro corta el anterior; `aria-pressed` y `aria-label` («Pausar …») cambian; morph play↔pausa con GSAP (`attr:{d}` entre dos paths con igual cantidad de comandos, 180ms); progreso avanza con `timeupdate`; arrastrar el range hace seek; al terminar vuelve a estado inicial. Error de carga (`error` del audio) → fila con clase `tema--error`, texto «No se pudo cargar el audio», `aria-pressed="false"`.

- [ ] **Step 1: Tests que fallan** — `formato.test.ts`: `218→"3:38"`, `247.4→"4:07"`, `0→"--:--"`, `NaN→"--:--"`, `Infinity→"--:--"`. `repertorio.spec.ts`: clic en play de «Oficios» → `aria-pressed="true"`; clic en «Soy Uruguayo» → «Oficios» vuelve a `false`; Review Focus 4: interceptar `**/repertorio/1.mp4` con `route.abort()` → clic → en ≤ 3s la fila tiene `tema--error` y `aria-pressed="false"`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Repertorio con reproductor y morph play/pausa`.

### Task 11: El Disco — mapa pirograbado

**Files:**
- Create: `src/components/Disco.astro`, `src/components/MapaUruguay.astro`, `tests/e2e/disco.spec.ts`
- Modify: `src/scripts/revelado.ts` (añade `[data-revelar="trazo"]`)

**Interfaces:**
- `MapaUruguay.astro`: SVG inline `viewBox` propio, un `<path pathLength="1">` con el contorno de Uruguay (simplificado de Natural Earth 1:50m, dominio público; ~60–120 puntos, reconocible: Río de la Plata, Laguna Merín, frontera del Río Uruguay) + un círculo en la ubicación de Pando; `stroke: var(--oro-viejo)`, `role="img"`, `aria-label="Mapa de Uruguay"`.
- `trazo`: `strokeDashoffset 1→0` en 2.2s `power2.inOut` al entrar (`once`); el punto de Pando aparece al final. Reduce/sin JS: dibujado completo.
- Disco (papel): título «Soy Uruguayo», «Segundo disco · 2026», texto de `main:index.html:567-633` (disponible desde el viernes 24 de julio de 2026, autogestionado, en pendrive con souvenir de madera grabado a fuego), foto `disco-soy-uruguayo` como copia impresa, CTA «Pedir el disco por WhatsApp» (`wa.me` con texto prellenado «Hola, quiero el disco Soy Uruguayo») + «Escribir por Instagram», y la frase «Es una producción independiente, hecha con mucho esfuerzo, dedicación y corazón.»

- [ ] **Step 1: Test que falla** — `#disco` contiene «24 de julio» y «pendrive», el enlace de WhatsApp incluye `text=`; el `path` del mapa tiene `pathLength="1"`; con reduce su `stroke-dashoffset` computado es `0`.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Sección El Disco con mapa que se dibuja`.

### Task 12: Videos

**Files:**
- Create: `src/components/Videos.astro`, `src/scripts/videos.ts`, `tests/e2e/videos.spec.ts`

**Interfaces:**
- Consumes: `videos`.
- Produces: `initVideos(): void`.
- Marcado (oscuro): primer video destacado a ancho completo, los otros dos en 2 columnas (1 en móvil). Cada uno: `<button class="video" aria-label="Reproducir video: {titulo}">` con miniatura `https://i.ytimg.com/vi/{id}/hqdefault.jpg` (`loading="lazy"`, B/N por CSS `filter: grayscale(1)` — excepción aceptada: imagen externa), franjas de cine (`::before/::after` 10% alto, `--oscuro`), título en `.dato`. Sin JS: el botón es un `<a href="https://www.youtube.com/watch?v={id}">`.
- Hover (puntero fino, motionOK): miniatura `scale 1.04`, 400ms `expo.out`; franjas se abren `scaleY .6`. Clic: reemplaza por `<iframe src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="{titulo}">` y le pasa el foco. Abrir otro cierra el anterior (portar `main:script.js:429-488`).

- [ ] **Step 1: Test que falla** — 3 botones con `aria-label` que empieza «Reproducir video:»; clic en el primero → existe un `iframe` con `src` que contiene `youtube-nocookie.com/embed/FTPrXeWkYpg` (interceptar y abortar la red de YouTube); clic en el segundo → hay un solo iframe.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Videos en formato cine`.

### Task 13: Trayectoria — tira de negativos

**Files:**
- Create: `src/components/Trayectoria.astro`, `src/scripts/trayectoria.ts`, `tests/e2e/trayectoria.spec.ts`

**Interfaces:**
- Consumes: `trayectoria`, `mm`.
- Produces: `initTrayectoria(): void`.
- Marcado (papel): `<ol class="tira">` de 9 cuadros: año gigante (Archivo 850), título, texto; borde de perforaciones arriba/abajo (SVG repetido de fondo); contador fijo «Cuadro 03 / 09» (`aria-hidden`, tabular-nums). Por defecto vertical.
- `motionOK && ancho`: pin + `x` scrub como Task 8 (misma técnica, `invalidateOnRefresh`); el contador se actualiza con `onUpdate` según el cuadro más cercano al centro.

- [ ] **Step 1: Tests que fallan** — 9 `li` con años `2011…2026`; escritorio: tras scrollear dentro del pin, el contador muestra un número > 01; Review Focus 3: desde arriba de todo, clic en «Trayectoria» del nav → al terminar el scroll, el `h2` de `#trayectoria` es visible en el viewport (`top` entre 0 y 200) y el primer cuadro (2011) también; idem «Integrantes» con el primer músico.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Trayectoria como tira de negativos`.

### Task 14: Galería — hoja de contactos, lupa y visor

**Files:**
- Create: `src/components/Galeria.astro`, `src/scripts/galeria.ts`, `tests/e2e/galeria.spec.ts`

**Interfaces:**
- Consumes: fotos `g1`…`g9` (Task 3), `Flip`, `mm`.
- Produces: `initGaleria(): void`.
- Marcado (oscuro): título «Galería», grilla de contactos 3×3 (móvil 2 columnas) con numeración de fotograma pequeña bajo cada una (la hoja de contactos real la tiene: es información, no decoración). Cada foto es `<a href="{url grande}" class="contacto" aria-label="Ver foto {n} de 9: {alt}">` con `<Picture>`. `<dialog class="visor" aria-label="Visor de fotos">` con imagen, `epigrafe`, botones «Anterior», «Siguiente», «Cerrar».
- Lupa (sólo `(hover:hover) and (pointer:fine)` y motionOK): círculo de 160px que sigue al puntero con `gsap.quickTo` (`x`,`y`, 0.25s) mostrando la misma foto a 2.2× (`background-image` + `background-position` calculado); se oculta al salir.
- Visor: clic → `Flip.getState(miniatura)` → `showModal()` → `Flip.from(state,{duration:.6, ease:"expo.inOut", absolute:true})` hacia la imagen del visor; cerrar hace el inverso y devuelve el foco a la miniatura; flechas ←/→ navegan; reduce: fundido 150ms. Sin JS: el enlace abre la foto.

- [ ] **Step 1: Tests que fallan** — 9 enlaces `.contacto`; clic en el 4.º → `dialog[open]`, la imagen del visor corresponde a `g4`; `ArrowRight` → `g5`; Review Focus 5: `Escape` → dialog cerrado y `document.activeElement` es el enlace del 5.º (la última vista) — decisión: el foco vuelve a la miniatura de la última foto mostrada.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Galería: hoja de contactos con lupa y visor`.

### Task 15: Créditos finales y contacto

**Files:**
- Create: `src/components/Creditos.astro`, `tests/e2e/creditos.spec.ts`
- Modify: `src/scripts/revelado.ts` (añade `[data-revelar="creditos"]`)

**Interfaces:**
- Consumes: `integrantes`, `redes`, `grupo`.
- Marcado (oscuro), `id="contacto"`: título «Contratá a Estampas del Sur», texto breve (shows, fiestas, festivales; desde Pando a todo el país — sólo si está en `main:index.html:900-919`, si no usar ese texto tal cual), botones «Escribir por WhatsApp» (primario oro), «Escribir por mail» (`mailto:`), «Instagram». Luego `<footer>`: emblema a color (120px), bloque de créditos estilo final de película — dos columnas alineadas al centro con rol a la derecha alineado y nombre a la izquierda («Bajo — Guillermo Pérez» como filas de tabla, `<dl>`), Pando, Canelones · Uruguay, redes, contacto, «Creada por Alejandro Chiesa.», año dinámico en build (`new Date().getFullYear()`).
- `creditos`: las filas suben con scrub (`y 60→0`, opacidad) a medida que se entra; el emblema entra al final con `scale .9→1` + opacidad. Reduce: opacidad.

- [ ] **Step 1: Test que falla** — `#contacto` tiene enlaces a `https://wa.me/59895871148`, `mailto:estampasdelsur23@gmail.com` e Instagram; el footer lista los 5 nombres y contiene «Creada por Alejandro Chiesa».
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `Cierre con créditos finales`.

### Task 16: Verificación final y entrega

**Files:**
- Create: `tests/e2e/a11y.spec.ts`, `docs/superpowers/verificacion-rediseno.md`
- Modify: memoria del proyecto (fuera del repo)

- [ ] **Step 1: Test** — `a11y.spec.ts`: recorrer con `Tab` toda la página en escritorio y verificar que cada elemento enfocado tiene `outline-style` ≠ `none`; todos los `img` tienen atributo `alt`; todos los botones/enlaces miden ≥ 44×44 en móvil; no hay scroll horizontal (`scrollWidth <= innerWidth`) en 390px; cero `console.error` en carga y scroll completo.
- [ ] **Step 2:** Run `npm run check && npm test && npm run build && npm run e2e` → todo PASS.
- [ ] **Step 3:** Capturas de cada sección a 1440 y 390 (con y sin reduce) en `scratchpad`; revisión visual contra spec §2–§3 y reglas craft; corregir lo que no cumpla.
- [ ] **Step 4:** Medir con Playwright (`page.on("response")`) los bytes transferidos en la carga inicial y el LCP (`PerformanceObserver` `largest-contentful-paint`) con red 4G simulada (CDP `Network.emulateNetworkConditions` 9 Mbps/170ms); comparar con `main` servido igual. Criterio: bytes ≤ ~1.9 MB y LCP < 2.5s. Anotar resultados en `verificacion-rediseno.md`.
- [ ] **Step 5:** Revisar `netlify.toml` y que `dist/` incluye `repertorio/`, `og/`, favicon. Commit `Verificación final del rediseño`.
- [ ] **Step 6:** Informar al usuario y ofrecer: push de la rama para vista previa en Netlify (pedir confirmación antes de pushear).
