// Portada (spec §4): un solo timeline maestro con arnés `?t=N` / `?t=fin`.
//
// Lecciones que se respetan acá:
// - La entrada y el scrub de scroll NUNCA animan lo mismo a la vez: el
//   ScrollTrigger se crea recién en el onComplete de la entrada (también
//   al saltarla con progress(1)) y con immediateRender:false.
// - El zoom se mide en vivo (rects reales, sin transform) y el scroll lo
//   recalcula en cada refresh (invalidateOnRefresh + valores función).
// - Al revertir `mm` (p. ej. se activa movimiento reducido) todo vuelve al
//   estado final de CSS.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { condiciones, mm, pausarScroll, reanudarScroll } from "./motion";

declare global {
  interface Window {
    __portada?: gsap.core.Timeline;
    __portadaSaltar?: boolean;
  }
}

/** Un pelo más que «cubrir» para que ningún medio píxel deje ver el canal. */
const SOBREESCALA = 1.004;
const EVENTOS_SALTO = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
const ESPERA_MAX_FOTOS = 1500; // ms: no retener la entrada por una foto lenta

interface Zoom {
  x: number;
  y: number;
  scale: number;
}

/**
 * Transform de la hoja (origen 0 0) que lleva la toma elegida a cubrir la
 * portada centrada. Mide con la hoja y la cámara sin transform, así sirve
 * tanto al empezar como en cada refresh del scroll.
 */
function medirZoom(portada: HTMLElement, camara: HTMLElement, hoja: HTMLElement, marco: HTMLElement): Zoom {
  const previos = [camara.style.transform, hoja.style.transform];
  camara.style.transform = "none";
  hoja.style.transform = "none";
  const p = portada.getBoundingClientRect();
  const h = hoja.getBoundingClientRect();
  const m = marco.getBoundingClientRect();
  [camara.style.transform, hoja.style.transform] = previos;

  const scale = Math.max(p.width / m.width, p.height / m.height) * SOBREESCALA;
  const cx = m.left + m.width / 2 - h.left;
  const cy = m.top + m.height / 2 - h.top;
  return {
    x: p.left + p.width / 2 - h.left - scale * cx,
    y: p.top + p.height / 2 - h.top - scale * cy,
    scale,
  };
}

function esperarFotos(imagenes: HTMLImageElement[]): Promise<unknown> {
  const decodificadas = Promise.all(imagenes.map((img) => img.decode().catch(() => undefined)));
  const plazo = new Promise((listo) => setTimeout(listo, ESPERA_MAX_FOTOS));
  return Promise.race([decodificadas, plazo]);
}

export function initPortada(): gsap.core.Timeline | null {
  const portada = document.querySelector<HTMLElement>(".portada");
  const camara = portada?.querySelector<HTMLElement>(".portada__camara");
  const hoja = portada?.querySelector<HTMLElement>(".hoja");
  const marco = portada?.querySelector<HTMLElement>(".hoja__elegida .hoja__marco");
  const titulo = portada?.querySelector<HTMLElement>(".portada__titulo");
  if (!portada || !camara || !hoja || !marco || !titulo) return null;

  const cuadros = gsap.utils.toArray<HTMLElement>(".hoja__cuadro", portada);
  const otros = cuadros.filter((c) => !c.classList.contains("hoja__elegida"));
  const exposiciones = gsap.utils.toArray<HTMLElement>(".hoja__exposicion", portada);
  const lapiz = portada.querySelector<SVGElement>(".hoja__lapiz");
  const trazo = lapiz?.querySelector("path");
  const velo = portada.querySelector(".portada__velo");
  const texto = portada.querySelector(".portada__texto");
  const bajada = portada.querySelector(".portada__bajada");
  const acciones = portada.querySelector(".portada__acciones");
  const listaCredenciales = portada.querySelector(".portada__credenciales");
  const credenciales = gsap.utils.toArray<HTMLElement>(".portada__credenciales li", portada);
  const fotos = gsap.utils.toArray<HTMLImageElement>(".hoja img", portada);

  const arnes = new URLSearchParams(location.search).get("t");
  let yaVista = false; // tras la primera entrada, nunca se repite
  let linea: gsap.core.Timeline | null = null;

  mm.add(condiciones, (ctx) => {
    const { motionOK, ancho } = ctx.conditions ?? {};

    if (!motionOK) {
      // Movimiento reducido: el CSS por defecto ya es el estado final.
      portada.removeAttribute("data-hoja");
      portada.setAttribute("data-estado", "final");
      linea = null;
      window.__portada = undefined;
      return;
    }

    portada.setAttribute("data-hoja", "");
    portada.setAttribute("data-estado", "inicio");

    let vivo = true;
    let terminada = false;
    let pausamos = false;
    let reaplicarZoom: (() => void) | null = null;

    const split = SplitText.create(titulo, { type: "lines", mask: "lines" });
    gsap.set(titulo, { opacity: 1 }); // las líneas quedan ocultas por su máscara

    let zoom: Zoom = { x: 0, y: 0, scale: 1 };
    const medir = () => (zoom = medirZoom(portada, camara, hoja, marco));

    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "expo.out" },
      onComplete: () => ctx.add(terminar),
    });

    // 0–1.2 s: las ocho tomas se revelan (la capa de exposición se apaga)
    tl.to(cuadros, { opacity: 1, duration: 0.5, stagger: 0.1 }, 0).to(
      exposiciones,
      { opacity: 0, duration: 0.5, stagger: 0.1 },
      0,
    );

    // 1.2–2.0 s: el lápiz marca la elegida
    if (trazo) {
      tl.fromTo(
        trazo,
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" },
        1.2,
      );
    }

    // 2.0–3.4 s: la cámara entra hasta que la elegida llena la portada.
    // Valores función: se miden al llegar a este tramo, no al cargar.
    tl.to(
      hoja,
      { x: () => medir().x, y: () => zoom.y, scale: () => zoom.scale, duration: 1.4 },
      2.0,
    )
      .to(otros, { opacity: 0.15, duration: 1.4 }, 2.0)
      .to(lapiz, { opacity: 0, duration: 0.5, ease: "power1.out" }, 2.0);

    // 3.4–4.4 s: el nombre sube por líneas, luego bajada, botones y credenciales
    tl.to(velo, { opacity: 1, duration: 1 }, 3.1)
      .fromTo(split.lines, { yPercent: 100 }, { yPercent: 0, duration: 0.8, stagger: 0.12 }, 3.4)
      .fromTo(bajada, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 3.7)
      .fromTo(acciones, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 3.8)
      .to(listaCredenciales, { opacity: 1, duration: 0.5, ease: "power1.out" }, 3.9)
      .fromTo(
        credenciales,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05 },
        3.95,
      );

    linea = tl;
    window.__portada = tl;

    const saltar = () => tl.progress(1);
    const quitarSaltos = () => {
      for (const tipo of EVENTOS_SALTO) window.removeEventListener(tipo, saltar, { capture: true });
    };

    const terminar = () => {
      if (terminada || !vivo) return;
      terminada = true;
      yaVista = true;
      quitarSaltos();
      portada.setAttribute("data-estado", "final");
      if (pausamos) {
        pausamos = false;
        reanudarScroll();
      }
      crearScroll();
    };

    const crearScroll = () => {
      if (ancho) {
        // Pin + scrub: la cámara se aleja hasta la hoja y la hoja sale.
        const salida = gsap.timeline({
          defaults: { ease: "none", immediateRender: false },
          scrollTrigger: {
            trigger: portada,
            start: "top top",
            end: "+=100%",
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            refreshPriority: 1,
          },
        });
        salida
          .fromTo(
            hoja,
            { x: () => medir().x, y: () => zoom.y, scale: () => zoom.scale },
            { x: 0, y: 0, scale: 1, ease: "power2.out", duration: 0.6 },
            0,
          )
          .fromTo(otros, { opacity: 0.15 }, { opacity: 1, duration: 0.5 }, 0)
          .fromTo(texto, { opacity: 1, y: 0 }, { opacity: 0, y: -48, duration: 0.25 }, 0)
          .fromTo(velo, { opacity: 1 }, { opacity: 0, duration: 0.3 }, 0)
          .fromTo(camara, { yPercent: 0, opacity: 1 }, { yPercent: -30, opacity: 0, duration: 0.4 }, 0.6);
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
      } else {
        // Angosto: sin pin; la foto se queda un poco atrás al subir.
        gsap.fromTo(
          camara,
          { yPercent: 0 },
          {
            yPercent: 15,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: portada, start: "top top", end: "bottom top", scrub: 1 },
          },
        );
        // El zoom quedó fijo al terminar: rehacerlo si cambia el tamaño.
        reaplicarZoom = () => ctx.add(() => gsap.set(hoja, medir()));
        ScrollTrigger.addEventListener("refresh", reaplicarZoom);
      }
    };

    // Arnés para capturas y pruebas
    if (arnes === "fin") {
      tl.progress(1);
    } else if (arnes !== null && !Number.isNaN(Number(arnes))) {
      pausarScroll();
      pausamos = true;
      tl.pause().seek(Number(arnes));
    } else if (yaVista || window.__portadaSaltar || window.scrollY > 2) {
      // Ya se vio, o el usuario llegó a interactuar antes de que corriera esto.
      tl.progress(1);
    } else {
      pausarScroll();
      pausamos = true;
      for (const tipo of EVENTOS_SALTO) {
        window.addEventListener(tipo, saltar, { capture: true, passive: true });
      }
      void esperarFotos(fotos).then(() => {
        if (vivo && !terminada && tl.progress() === 0) tl.play();
      });
    }

    return () => {
      vivo = false;
      yaVista = true; // si se interrumpió a la mitad, no se repite

      quitarSaltos();
      if (reaplicarZoom) ScrollTrigger.removeEventListener("refresh", reaplicarZoom);
      if (pausamos) reanudarScroll();
      // El contexto revierte tweens, SplitText y ScrollTriggers; además se
      // limpia la caché de transform para que una nueva pasada mida limpio.
      gsap.set([hoja, camara, texto, velo, listaCredenciales, ...cuadros], {
        clearProps: "transform,opacity",
      });
      portada.removeAttribute("data-hoja");
      portada.setAttribute("data-estado", "final");
      if (window.__portada === tl) window.__portada = undefined;
    };
  });

  return linea;
}
