# Rediseño «documental» — Estampas del Sur

Fecha: 2026-10-09 · Rama: `rediseno-documental` · Estado: aprobado en conversación, pendiente de revisión escrita

## 1. Objetivo

Rehacer por completo la imagen del sitio de Estampas del Sur (grupo de folklore uruguayo de Pando, Canelones) con una estética de **documental cinematográfico en blanco y negro**, mucha animación con oficio, y migrar el sitio a **Astro**.

El objetivo del sitio no cambia: presentar al grupo y **conseguir contrataciones** (WhatsApp 095 871 148, mail, Instagram).

### Decisiones tomadas por el usuario

| Tema | Decisión |
|---|---|
| Dirección | Documental cinematográfico |
| Tratamiento | **A · Archivo en blanco y negro** (fotos en B/N con grano; oro del emblema como único color) |
| Apertura | **Hoja de contactos → círculo de lápiz dorado → zoom a la foto elegida** |
| Stack | **Astro** (rechazadas: reescritura vanilla, re-skin, Next.js) |
| Se conserva | Logo dorado (emblema) y **todas** las secciones |
| Se libera | Paleta, tipografías, intro en video |
| Material visual | Sólo las fotos actuales del repo (no hay video propio) |

### Criterios de éxito

1. Ninguna parte del sitio conserva la estética fogón/coral (paleta, Raleway/Fraunces/Manrope, brasas, haces, piedra, intro de video).
2. Todas las fotos, con luces dispares de origen (violeta, verde, rojo, día), se ven como una misma serie en B/N.
3. La portada ejecuta la secuencia de hoja de contactos completa en escritorio y móvil, y un estado estático equivalente con `prefers-reduced-motion`.
4. Todo el contenido actual (textos, datos, enlaces, audio, videos, JSON-LD) está presente y con los datos corregidos (ver §7).
5. Contraste AA en todas las combinaciones de texto; foco visible en todo control; áreas táctiles ≥ 44 px.
6. Lo que descarga un navegador moderno en la carga inicial no supera lo actual (~1.9 MB) y LCP de la portada < 2.5 s en 4G simulado.
7. `npm run build` sin errores y Netlify publicando `dist/`.

## 2. Sistema visual

### 2.1 Idea central: cuarto oscuro / papel fotográfico

El sitio alterna dos ambientes. **Cuarto oscuro** para las escenas donde se revelan las fotos; **papel** para las de lectura. La transición entre ambos funde el color de fondo con el scroll («se prende la luz»).

### 2.2 Color (tokens en `src/styles/tokens.css`)

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `--oscuro` | `#121110` | fondo de escenas de foto | — |
| `--papel` | `#E8E2D5` | fondo de lectura | — |
| `--tinta` | `#1C1A17` | texto sobre papel | 13.4:1 |
| `--plata` | `#9A948A` | datos/epígrafes sobre oscuro | 6.3:1 |
| `--lapiz` | `#5C574F` | datos/epígrafes sobre papel | 5.5:1 |
| `--oro` | `#D4AE55` | único acento, sobre oscuro (CTA con texto `--oscuro`) | 9.0:1 |
| `--oro-viejo` | `#7A5D1C` | el mismo acento sobre papel | 4.8:1 |

Texto principal sobre oscuro = `--papel` (14.6:1). Reglas: `--plata` nunca sobre papel, `--oro` nunca como texto sobre papel. Sin gradientes decorativos ni glow (craft R1/R2); la única excepción es el fundido de fondo entre ambientes y los velos de legibilidad sobre foto.

### 2.3 Tipografía

- **Archivo** variable (ejes `wdth` 62–125, `wght`):
  - Títulos: `wdth 125`, `wght 850`, mayúsculas, `line-height .88–.92`.
  - Menú, datos, fechas, botones: `wdth 72`, `wght 500–700`, sentence case.
- **Newsreader** variable (`opsz`): texto corrido (18 px, `line-height 1.6`, medida máx. 65ch); itálica para epígrafes y citas.
- Escala 1.333 sobre 18 px: 18 · 24 · 32 · 42 · 56; título de portada fluido hasta ~160 px (`clamp`).
- Fuentes autoalojadas con `@fontsource-variable/archivo` y `@fontsource-variable/newsreader`, `font-display: swap`, preload de los dos archivos usados en la portada.

### 2.4 Recursos gráficos

- **Grano de película**: una capa fija global con ruido SVG, opacidad baja, animada a pasos (se detiene con movimiento reducido).
- **Copias impresas** (sólo en papel): foto con borde `#F2EDE3`, leve rotación (±1.5°) y una sombra de elevación suave de dos capas.
- **Lápiz dorado**: trazos SVG a mano alzada en `--oro` (círculo de la portada, subrayados puntuales, mapa del disco).
- Escala de z-index documentada en `:root`; `isolation: isolate` en cada sección.

## 3. Guion de secciones

Orden igual al actual. Cada sección es un componente en `src/components/`.

| # | Componente | Ambiente | Contenido | Movimiento |
|---|---|---|---|---|
| 0 | `Nav` | sobre ambos | emblema + 10 enlaces + CTA «Contrataciones» | se esconde al bajar, aparece al subir; menú móvil a pantalla completa |
| 1 | `Portada` | oscuro | hoja de contactos (8 fotos), nombre, bajada «Folklore uruguayo desde Pando», CTA, credenciales (Cosquín 2019 · Premios Graffiti 2024 · Festival del Mate 2017 · Interés Cultural 2017) | ver §4 |
| 2 | `Grupo` | papel | párrafo de presentación + 3 cifras (15 años, 3 videoclips, 4 ritmos) + ritmos (milonga, chamarrita, polka, cumbia folklórica) | texto revelado línea por línea con scrub (gris → tinta); cifras como contador de fotogramas |
| 3 | `Integrantes` | oscuro | 5 músicos: foto, nombre, rol, IG/FB | travelling horizontal fijado en escritorio (≥ 900 px); en móvil, lista vertical con revelado |
| 4 | `Historia` | papel | narrativa actual con capitular | copias impresas que caen y hacen foco al entrar |
| 5 | `Repertorio` | oscuro | 3 temas reproducibles (Oficios, Soy Uruguayo, La Refalosa) con duración | botón play↔pausa con morph SVG; progreso como tira de película que avanza |
| 6 | `Disco` | papel | «Soy Uruguayo» 2026, pendrive + souvenir de madera, pedidos 095 871 148 o redes, frase de cierre | mapa de Uruguay que se dibuja en trazo dorado (pirograbado) |
| 7 | `Videos` | oscuro | videoclips de YouTube (IDs actuales), el primero destacado | franjas de cine; acercamiento al pasar el mouse; facade → iframe `youtube-nocookie` al clic |
| 8 | `Trayectoria` | papel | hitos 2011 → 2026 (§7) | tira de negativos horizontal fijada con scrub + contador de cuadros; en móvil vertical |
| 9 | `Agenda` | papel | estado vacío «No hay fechas anunciadas» + WhatsApp / Instagram; estructura lista para cargar fechas desde `src/data/fechas.ts` | revelado simple |
| 10 | `Galeria` | oscuro | 9 fotos (`g1`–`g9`) como hoja de contactos | lupa de fotógrafo al hover (puntero fino); clic abre visor ampliando desde la miniatura (GSAP Flip); flechas y Escape |
| 11 | `Creditos` | oscuro | CTA de contratación, emblema, «créditos finales» con los 5 nombres y roles, contacto, redes, «Creada por Alejandro Chiesa», año | créditos que suben con scrub; emblema que entra al final |

La marquesina de ritmos desaparece; los ritmos se integran en `Grupo`.

## 4. Portada — secuencia

Un solo timeline maestro (`src/scripts/portada.ts`) con arnés `?t=N` para congelar cuadros.

1. **0–1.2 s** — fondo oscuro; las 8 fotos de la hoja aparecen de a una (opacidad + exposición de `brightness` simulada con capa encima), stagger corto.
2. **1.2–2.0 s** — el círculo de lápiz dorado se dibuja (stroke-dashoffset, `pathLength="1"`) alrededor de la foto elegida (`portada`).
3. **2.0–3.4 s** — la cámara entra: la hoja escala/traslada (sólo `transform`) hasta que la foto elegida llena la pantalla; las demás se oscurecen.
4. **3.4–4.4 s** — sube el nombre por líneas (SplitText con máscara), luego bajada, CTA y credenciales.
5. **Scroll** (scrub, `pin` de la portada ~100vh extra): proceso inverso — la cámara se aleja hasta volver a la hoja y la hoja sube saliendo de cuadro. Se dispara desde el `onComplete` de la entrada (lección aprendida: nunca animar la misma propiedad desde entrada y scroll a la vez).

- Corre en cada visita pero se puede saltar con cualquier scroll/tecla (salta al estado final). Duración total ≤ 4.5 s.
- **Movimiento reducido:** se muestra directamente el estado final (foto a pantalla completa + nombre), sin pin.
- **Sin JS:** el HTML/CSS por defecto es el estado final visible.
- **LCP:** la foto elegida se precarga y es el elemento LCP.
- Móvil: hoja 2×4 en vertical; misma secuencia.

## 5. Arquitectura

```
astro.config.mjs        package.json        netlify.toml (build: npm run build, publish: dist)
public/                 repertorio/*.mp4|mpeg, favicon, og (portada-hd.jpg color)
src/
  assets/fotos/bn/      fotos graduadas a B/N (fuente de <Picture>)
  data/                 integrantes.ts, trayectoria.ts, temas.ts, videos.ts,
                        credenciales.ts, redes.ts, fechas.ts, grupo.ts
  layouts/Base.astro    <head>, SEO, canonical, OG/Twitter, JSON-LD MusicGroup, fuentes
  components/           Nav, Portada, Grupo, Integrantes, Historia, Repertorio, Disco,
                        Videos, Trayectoria, Agenda, Galeria, Creditos, Grano, Lapiz (SVG)
  scripts/
    motion.ts           Lenis + gsap.ticker único + ScrollTrigger.update + gsap.matchMedia
                        (motionOK / reduce); expone helpers y el estado de movimiento
    portada.ts  revelado.ts  integrantes.ts  trayectoria.ts
    reproductor.ts  videos.ts  galeria.ts  nav.ts  ambientes.ts (fundido oscuro↔papel)
  styles/               tokens.css, base.css (reset, tipografía, grano, foco, utilidades)
  pages/index.astro     compone las secciones
scripts/graduar-bn.py   genera src/assets/fotos/bn/ desde las fotos originales
```

Principios:
- **Contenido separado del diseño**: los componentes leen `src/data/`; corregir un dato es editar un archivo.
- **Un módulo por comportamiento**, cada uno exporta `init(root)` y se registra en `index.astro`; todos usan `motion.ts` y respetan su `matchMedia`.
- **Mejora progresiva**: sin JS todo el contenido es visible y los enlaces funcionan; el reproductor y el visor dependen de JS pero degradan a `<audio controls>` / enlace a la foto.
- Se conservan las lecciones del sitio actual: un solo reloj GSAP↔Lenis, `lenis.scrollTo` sin offset manual (manda `scroll-margin-top`), foco repuesto en anclajes, `lenis.stop()` con menú abierto, no copiar `iframe{pointer-events:none}` de Lenis.

### Fotos

- `scripts/graduar-bn.py` (Pillow) convierte una vez cada foto usada a B/N con ajuste por foto (mezcla de canales, curva de contraste, punto negro) y la deja en `src/assets/fotos/bn/`. Se commitea el resultado.
- `<Picture>` de Astro genera AVIF + WebP en anchos según el render medido; `width/height` explícitos.
- Las originales color se conservan (`fotos/`, `musicos/`, `gal/`). `og:image`, favicon y logo del JSON-LD siguen en JPG color.
- El emblema `logo-nuevo` se mantiene a color (es el oro del sitio).

### Dependencias

`astro`, `gsap` (con ScrollTrigger, SplitText, Flip), `lenis`, `@fontsource-variable/archivo`, `@fontsource-variable/newsreader`. Nada más.

## 6. Accesibilidad, rendimiento y movimiento

- **Movimiento reducido (por niveles):** se quitan pins, travellings, zoom, parallax, Lenis y grano animado; se conservan fundidos ≤ 200 ms, transiciones de color y foco. Cambios en vivo de la preferencia vía `gsap.matchMedia`.
- Animaciones sólo de `transform` y `opacity` (excepción acotada: `clip-path` en máscaras de texto y el fundido de fondo entre ambientes).
- Pins y travellings horizontales sólo ≥ 900 px de ancho; en móvil, flujo vertical.
- Estados `hover`, `focus-visible`, `active`, `disabled` diseñados en todo control; enlace «Ir al contenido».
- Visor de galería: `dialog` con foco atrapado, Escape, flechas, `aria-label` por foto.
- Reproductor: botones con `aria-pressed`/`aria-label` que cambian con el estado; un solo `<audio>` compartido; duraciones desde metadata.
- Imágenes con `alt` descriptivo; las de la hoja de contactos decorativas salvo la elegida.

## 7. Datos fieles (fuente: `historia.txt` + correcciones del usuario)

- Nace en **2011 en Pando, Canelones**. Ciudad del grupo = Pando en todo el sitio.
- 2016 Arco de Córdoba (Argentina, labor cultural).
- 2017 **primer premio** Festival del Mate (San José) y **segundo premio** Festival del Olimar (Treinta y Tres); declarados de Interés Cultural y Municipal (Intendencia de Canelones, Municipios de Pando y Empalme Olmos).
- 2018 primer CD «Savia Nueva» (Productora Hipocampo) + videoclip «Historias del Pasado».
- 2019 Cosquín (3 escenarios + peñas) + Certamen de Canción Inédita (Intendencia de Canelones).
- 2020 finalistas del certamen de videoclip con «Pago en Pago» (Canal 10 y A+V).
- 2022 videoclip «Sacudiendo el Ser Humano».
- 2024 videoclip «Soy Uruguayo» → nominación Premios Graffiti.
- 2026 disco «Soy Uruguayo» (desde el 24/07/2026, autogestionado, en pendrive con souvenir de madera).
- Integrantes: Guillermo Pérez (bajo), Marcelo Marrero (primera voz · segunda guitarra), Fernando Saavedra (primera guitarra · segunda voz), Henry Acuña (acordeón y teclados), Diego Rodríguez (batería).
- Contacto: WhatsApp 095 871 148, estampasdelsur23@gmail.com, Instagram y Facebook actuales. Sin canal de YouTube/Spotify enlazado.
- Todo texto nuevo se escribe con estos datos; no se inventan citas ni testimonios.

## 8. Verificación

1. `npx astro check` y `npm run build` sin errores ni advertencias.
2. Servir `dist/` y capturar cada sección a 1440 px y 390 px.
3. Portada congelada con `?t=0`, `?t=2`, `?t=3.4`, `?t=fin`; revisar recortes, FOUC y saltos.
4. Camino de movimiento reducido emulado: contenido completo, sin pins, sin teletransportes.
5. Navegación sólo con teclado: menú, anclajes, reproductor, videos, visor.
6. Medir peso transferido y LCP frente al sitio actual.
7. Trampa conocida: la pestaña automatizada en `visibilityState: hidden` congela rAF, IntersectionObserver y metadata de audio → verificar eso en pestaña real o disparando handlers a mano.

## 9. Fuera de alcance

- Nuevas páginas (por integrante, por disco) y transiciones entre páginas: quedan habilitadas por Astro pero no se hacen ahora.
- Fechas reales de agenda (no hay).
- Mejorar la foto del disco (621×470): se usa la existente hasta que haya original.
- Venta online / carrito.

## 10. Despliegue

- Todo el trabajo en la rama `rediseno-documental`; `main` y https://estampasdelsur.netlify.app siguen con la versión actual.
- Vista previa de la rama en Netlify (deploy de rama) para que el grupo la revise.
- Merge a `main` sólo con aprobación del usuario; ese push cambia el build de Netlify a `npm run build` → `dist/`.
