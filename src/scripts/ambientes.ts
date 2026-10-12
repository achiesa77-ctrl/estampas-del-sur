// Ambientes oscuro/papel (spec §2.1, §3 fila 2+): al cruzar cada frontera
// de sección el color se funde con el scroll («se prende la luz»).
//
// Sin JS, o antes de que este módulo corra, cada sección ya pinta su
// propio fondo opaco con la clase .ambiente-oscuro/.ambiente-papel
// (ruling R2): este módulo sólo agrega el cruce por encima.
//
// - motionOK: la sección que ENTRA funde su propio fondo y su color de
//   texto desde el ambiente de la anterior hasta el suyo, con scrub,
//   mientras sube desde el borde inferior hasta un poco más arriba de la
//   mitad. La que se está leyendo no se toca: conserva siempre su fondo
//   opaco. (Verificación final: antes el fundido se hacía en el <body> con
//   todas las secciones transparentes, y a mitad de camino quedaba un gris
//   donde ningún texto — ni tinta ni papel — llegaba a contraste AA; con
//   una sección corta como «Próximas fechas» arriba, ese gris era justo
//   la posición de lectura.) Se usa el elemento de cada sección como
//   trigger, así los pin-spacers no rompen la medición.
// - reduce: sin scrub; un cruce discreto por sección visible (mismo
//   criterio de línea que el scrollspy del nav) que alterna la clase del
//   body, con transición CSS de 150ms (base.css).
import { gsap } from "gsap";
import { condiciones, mm } from "./motion";

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
      for (let i = 1; i < secciones.length; i++) {
        const anterior = secciones[i - 1].getAttribute("data-ambiente");
        const actual = secciones[i].getAttribute("data-ambiente");
        if (!esAmbiente(anterior) || !esAmbiente(actual) || anterior === actual) continue;

        const desde = coloresDe(anterior);
        const hasta = coloresDe(actual);

        gsap.fromTo(
          secciones[i],
          { backgroundColor: desde.fondo, color: desde.texto },
          {
            backgroundColor: hasta.fondo,
            color: hasta.texto,
            ease: "none",
            scrollTrigger: {
              trigger: secciones[i],
              start: "top bottom",
              end: "top 60%",
              scrub: true,
            },
          },
        );
      }
      // El contexto de mm revierte los tweens (y sus estilos en línea) al
      // cambiar a movimiento reducido.
      return;
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
