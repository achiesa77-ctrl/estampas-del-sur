// Galería (spec §3 fila 10): lupa de fotógrafo sobre la hoja de contactos
// y visor <dialog> que se abre ampliando la miniatura. Markup en
// src/components/Galeria.astro (sin JS cada contacto es un enlace a la
// foto grande).
//
// Ampliación miniatura ↔ visor: la miniatura es un cuadrado recortado
// (object-fit: cover) y la foto del visor se ve entera, así que escalar una
// sobre la otra la deformaría a mitad de viaje. En vez de eso se escala
// UNIFORME y se recorta con clip-path el cuadrado central — el mismo
// recorte que muestra la miniatura — que después se abre hasta la foto
// completa (excepción de clip-path como máscara, igual que en la portada).
import { gsap } from "gsap";
import { mm, pausarScroll, reanudarScroll, reduceMotion } from "./motion";

const ZOOM = 2.2;
const LUPA = 160;
const DURACION = 0.6;

export function initGaleria(): void {
  const seccion = document.querySelector<HTMLElement>("#galeria");
  const dialog = seccion?.querySelector<HTMLDialogElement>("dialog.visor");
  const img = dialog?.querySelector<HTMLImageElement>(".visor__img");
  const pie = dialog?.querySelector<HTMLElement>(".visor__pie");
  const contador = dialog?.querySelector<HTMLElement>(".visor__contador");
  const lupa = seccion?.querySelector<HTMLElement>(".lupa");
  if (!seccion || !dialog || !img || !pie || !contador || !lupa) return;

  const contactos = Array.from(seccion.querySelectorAll<HTMLAnchorElement>("a.contacto"));
  if (!contactos.length) return;

  seccion.setAttribute("data-js", "");
  const total = contactos.length;
  const cromo = Array.from(
    dialog.querySelectorAll<HTMLElement>(".visor__cerrar, .visor__pie, .visor__controles"),
  );

  let indice = 0;
  let abierto = false;
  let cerrando = false;

  const miniatura = (i: number) => contactos[i].querySelector<HTMLElement>(".contacto__marco");

  /** Precarga la foto grande (al pasar o enfocar): el visor la necesita
   *  decodificada para medirla antes de ampliar. */
  const precargadas = new Set<string>();
  const precargar = (i: number) => {
    const url = contactos[i].dataset.grande;
    if (!url || precargadas.has(url)) return;
    precargadas.add(url);
    const imagen = new Image();
    imagen.src = url;
  };

  async function cargar(i: number): Promise<void> {
    const enlace = contactos[i];
    indice = i;
    img!.src = enlace.dataset.grande ?? enlace.href;
    img!.width = Number(enlace.dataset.ancho) || 0;
    img!.height = Number(enlace.dataset.alto) || 0;
    img!.alt = enlace.dataset.alt ?? "";
    pie!.textContent = enlace.dataset.alt ?? "";
    contador!.textContent = `${i + 1} / ${total}`;
    precargar((i + 1) % total);
    precargar((i - 1 + total) % total);
    // Tope de espera: si la red tarda, se sigue igual (la foto aparece
    // cuando llega) en vez de dejar el clic sin respuesta.
    await Promise.race([img!.decode().catch(() => {}), new Promise((r) => setTimeout(r, 500))]);
  }

  /** Estado "desde la miniatura" del <img> del visor: traslación + escala
   *  uniforme + recorte al cuadrado central. null si no se puede medir o
   *  la miniatura no está en pantalla (entonces sólo hay fundido). */
  function desdeMiniatura(i: number): gsap.TweenVars | null {
    const marco = miniatura(i);
    if (!marco) return null;
    const m = marco.getBoundingClientRect();
    const v = img!.getBoundingClientRect();
    if (!v.width || !v.height || m.bottom < 0 || m.top > innerHeight) return null;

    const lado = Math.min(v.width, v.height);
    const escala = m.width / lado;
    const recorteX = ((v.width - lado) / 2 / v.width) * 100;
    const recorteY = ((v.height - lado) / 2 / v.height) * 100;
    return {
      x: m.left + m.width / 2 - (v.left + v.width / 2),
      y: m.top + m.height / 2 - (v.top + v.height / 2),
      scale: escala,
      clipPath: `inset(${recorteY}% ${recorteX}% ${recorteY}% ${recorteX}%)`,
    };
  }

  async function abrir(i: number): Promise<void> {
    if (abierto) return;
    abierto = true;
    pausarScroll();
    dialog!.showModal();
    gsap.set(dialog!, { opacity: 0 });
    await cargar(i);

    if (reduceMotion()) {
      gsap.to(dialog!, { opacity: 1, duration: 0.15, ease: "none" });
      return;
    }

    gsap.set(dialog!, { opacity: 1 });
    const desde = desdeMiniatura(i);
    gsap.fromTo(cromo, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: DURACION * 0.6 });
    gsap.fromTo(
      ".visor__fondo",
      { opacity: 0 },
      { opacity: 1, duration: DURACION * 0.6, ease: "none" },
    );
    if (desde) {
      gsap.fromTo(
        img!,
        desde,
        {
          x: 0,
          y: 0,
          scale: 1,
          clipPath: "inset(0% 0% 0% 0%)",
          duration: DURACION,
          ease: "expo.inOut",
          clearProps: "transform,clipPath",
        },
      );
    } else {
      gsap.fromTo(img!, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }
  }

  /** Limpieza común (también si el diálogo se cierra por otra vía). */
  function alCerrar(): void {
    if (!abierto) return;
    abierto = false;
    cerrando = false;
    gsap.killTweensOf([dialog!, img!, ...cromo]);
    gsap.set([dialog!, img!, ...cromo, ".visor__fondo"], { clearProps: "all" });
    reanudarScroll();
    // Review Focus 5: el foco vuelve a la miniatura de la ÚLTIMA foto vista,
    // no a la que abrió el visor (el lector ya está en esa foto).
    contactos[indice].focus({ preventScroll: true });
  }

  function cerrar(): void {
    if (!abierto || cerrando) return;
    cerrando = true;
    const terminar = () => {
      dialog!.close();
      alCerrar();
    };

    if (reduceMotion()) {
      gsap.to(dialog!, { opacity: 0, duration: 0.15, ease: "none", onComplete: terminar });
      return;
    }

    const hacia = desdeMiniatura(indice);
    gsap.to(cromo, { opacity: 0, duration: 0.2 });
    gsap.to(".visor__fondo", { opacity: 0, duration: DURACION * 0.7, delay: DURACION * 0.3, ease: "none" });
    if (hacia) {
      gsap.to(img!, { ...hacia, duration: DURACION, ease: "expo.inOut", onComplete: terminar });
    } else {
      gsap.to(dialog!, { opacity: 0, duration: 0.3, onComplete: terminar });
    }
  }

  async function mostrar(i: number): Promise<void> {
    if (!abierto || cerrando) return;
    const siguiente = (i + total) % total;
    if (siguiente === indice) return;
    gsap.killTweensOf(img!);
    gsap.set(img!, { clearProps: "transform,clipPath" });
    await cargar(siguiente);
    gsap.fromTo(img!, { opacity: 0 }, { opacity: 1, duration: reduceMotion() ? 0.15 : 0.25 });
  }

  // Fondo propio animable (el ::backdrop no se puede animar con GSAP).
  const fondo = document.createElement("div");
  fondo.className = "visor__fondo";
  dialog.prepend(fondo);
  for (const atributo of Array.from(dialog.attributes)) {
    if (atributo.name.startsWith("data-astro-cid-")) fondo.setAttribute(atributo.name, "");
  }

  contactos.forEach((enlace, i) => {
    enlace.addEventListener("click", (evento) => {
      if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey)
        return;
      evento.preventDefault();
      void abrir(i);
    });
    enlace.addEventListener("pointerenter", () => precargar(i));
    enlace.addEventListener("focus", () => precargar(i));
  });

  dialog.addEventListener("click", (evento) => {
    const accion = (evento.target as Element).closest<HTMLElement>("[data-accion]")?.dataset.accion;
    if (accion === "cerrar") cerrar();
    else if (accion === "anterior") void mostrar(indice - 1);
    else if (accion === "siguiente") void mostrar(indice + 1);
  });

  // Escape: se intercepta para cerrar con la animación de vuelta.
  dialog.addEventListener("cancel", (evento) => {
    evento.preventDefault();
    cerrar();
  });
  dialog.addEventListener("close", alCerrar);

  dialog.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowRight") {
      evento.preventDefault();
      void mostrar(indice + 1);
    } else if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      void mostrar(indice - 1);
    }
  });

  // --- Lupa (sólo puntero fino y con movimiento) ------------------------
  mm.add(
    {
      lupaOK: "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    },
    (ctx) => {
      if (!ctx.conditions?.lupaOK) return;

      const moverX = gsap.quickTo(lupa, "x", { duration: 0.25, ease: "power3.out" });
      const moverY = gsap.quickTo(lupa, "y", { duration: 0.25, ease: "power3.out" });
      let primera = true;

      const alMover = (evento: PointerEvent) => {
        const enlace = (evento.target as Element).closest<HTMLAnchorElement>("a.contacto");
        const marco = enlace?.querySelector<HTMLElement>(".contacto__marco");
        if (!enlace || !marco) return ocultar();
        const m = marco.getBoundingClientRect();
        const px = evento.clientX - m.left;
        const py = evento.clientY - m.top;
        if (px < 0 || py < 0 || px > m.width || py > m.height) return ocultar();

        // Geometría del object-fit: cover de la miniatura, para que la lupa
        // muestre exactamente el punto que está bajo el puntero.
        const aspecto = (Number(enlace.dataset.ancho) || 1) / (Number(enlace.dataset.alto) || 1);
        const ancho = aspecto >= 1 ? m.height * aspecto : m.width;
        const alto = aspecto >= 1 ? m.height : m.width / aspecto;
        const ox = (m.width - ancho) / 2;
        const oy = (m.height - alto) / 2;
        const interior = LUPA - 4; // menos el borde de 2px
        lupa!.style.backgroundImage = `url("${enlace.dataset.grande}")`;
        lupa!.style.backgroundSize = `${ancho * ZOOM}px ${alto * ZOOM}px`;
        lupa!.style.backgroundPosition = `${interior / 2 - (px - ox) * ZOOM}px ${interior / 2 - (py - oy) * ZOOM}px`;

        const s = seccion!.getBoundingClientRect();
        const x = evento.clientX - s.left;
        const y = evento.clientY - s.top;
        if (primera) {
          gsap.set(lupa!, { x, y });
          primera = false;
        }
        moverX(x);
        moverY(y);
        lupa!.setAttribute("data-visible", "");
      };

      function ocultar() {
        lupa!.removeAttribute("data-visible");
        primera = true;
      }

      seccion.addEventListener("pointermove", alMover);
      seccion.addEventListener("pointerleave", ocultar);
      return () => {
        seccion.removeEventListener("pointermove", alMover);
        seccion.removeEventListener("pointerleave", ocultar);
        ocultar();
        gsap.set(lupa, { clearProps: "transform" });
      };
    },
  );
}
