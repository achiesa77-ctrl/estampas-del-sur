// Ambientes oscuro/papel (spec §2.1, §3 fila 2+): el fondo del body se
// funde al cruzar cada frontera de sección («se prende la luz»).
//
// Sin JS, o antes de que este módulo corra, cada sección ya pinta su
// propio fondo opaco con la clase .ambiente-oscuro/.ambiente-papel
// (ruling R2): este módulo sólo agrega el cruce de color por encima.
//
// - motionOK: un tween por frontera (scrollTrigger scrub) interpola
//   background-color/color del body entre los tokens de la sección
//   anterior y la siguiente. Mientras está activo, las secciones dejan
//   transparente su propio fondo (clase en <html>) para que se vea el
//   fundido; useamos el elemento de cada sección como trigger (no
//   posiciones fijas), así el pin-spacer de la portada no rompe la
//   medición: el refresh que portada.ts dispara al crear su pin
//   recalcula estos ScrollTrigger igual que a los suyos.
// - reduce: sin scrub; un cruce discreto por sección visible (mismo
//   criterio de línea que el scrollspy del nav) que alterna la clase del
//   body, con transición CSS de 150ms (base.css).
import { gsap } from "gsap";
import { condiciones, mm } from "./motion";

/** Con esta clase en <html>, las secciones dejan transparente su propio
 *  fondo (ver base.css) para que se note el fundido del body. */
const JS_ACTIVO = "ambientes-js";

type Ambiente = "oscuro" | "papel";

function leerToken(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

function coloresDe(ambiente: Ambiente): { fondo: string; texto: string } {
  return ambiente === "oscuro"
    ? { fondo: leerToken("--oscuro"), texto: leerToken("--papel") }
    : { fondo: leerToken("--papel"), texto: leerToken("--tinta") };
}

function esAmbiente(valor: string | null): valor is Ambiente {
  return valor === "oscuro" || valor === "papel";
}

function establecerClaseBody(ambiente: Ambiente): void {
  document.body.classList.toggle("ambiente-oscuro", ambiente === "oscuro");
  document.body.classList.toggle("ambiente-papel", ambiente === "papel");
}

export function initAmbientes(): void {
  const secciones = gsap.utils.toArray<HTMLElement>("section[data-ambiente]");
  if (secciones.length < 2) return;

  mm.add({ motionOK: condiciones.motionOK, reduce: condiciones.reduce }, (ctx) => {
    const { motionOK } = ctx.conditions ?? {};

    if (motionOK) {
      document.documentElement.classList.add(JS_ACTIVO);

      for (let i = 1; i < secciones.length; i++) {
        const anterior = secciones[i - 1].getAttribute("data-ambiente");
        const actual = secciones[i].getAttribute("data-ambiente");
        if (!esAmbiente(anterior) || !esAmbiente(actual) || anterior === actual) continue;

        const desde = coloresDe(anterior);
        const hasta = coloresDe(actual);

        gsap.fromTo(
          document.body,
          { backgroundColor: desde.fondo, color: desde.texto },
          {
            backgroundColor: hasta.fondo,
            color: hasta.texto,
            ease: "none",
            scrollTrigger: {
              trigger: secciones[i],
              start: "top 60%",
              end: "top 20%",
              scrub: true,
            },
          },
        );
      }

      return () => {
        document.documentElement.classList.remove(JS_ACTIVO);
        gsap.set(document.body, { clearProps: "backgroundColor,color" });
      };
    }

    // Movimiento reducido
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const ambiente = entrada.target.getAttribute("data-ambiente");
          if (entrada.isIntersecting && esAmbiente(ambiente)) establecerClaseBody(ambiente);
        }
      },
      { rootMargin: "-40% 0px -60% 0px" },
    );
    for (const seccion of secciones) observador.observe(seccion);

    return () => {
      observador.disconnect();
      document.body.classList.remove("ambiente-oscuro", "ambiente-papel");
    };
  });
}
