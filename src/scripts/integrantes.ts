// Integrantes (spec §3 fila 3): travelling horizontal fijado en escritorio.
// Markup en src/components/Integrantes.astro (por defecto: columna vertical,
// el estado final visible sin JS). Con motionOK && ancho, `.elenco` pasa a
// fila y la sección se fija mientras la fila se desplaza en `x`; cada
// retrato hace un acercamiento leve con `containerAnimation`.
//
// Task 13 (Trayectoria) reutiliza esta misma técnica de pin horizontal.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { condiciones, mm, scrollAPosicion } from "./motion";

export function initIntegrantes(): void {
  const seccion = document.querySelector<HTMLElement>("#integrantes");
  const ol = seccion?.querySelector<HTMLOListElement>(".elenco");
  if (!seccion || !ol) return;

  const musicos = gsap.utils.toArray<HTMLElement>(".musico", ol);

  mm.add(condiciones, (ctx) => {
    const { motionOK, ancho } = ctx.conditions ?? {};
    if (!(motionOK && ancho)) return;

    seccion.setAttribute("data-fila", "");

    // En fila cada retrato ocupa toda la pantalla: el `sizes` de la columna
    // (448px) quedaría corto, así que se agranda mientras dura la fila.
    const imagenes = musicos
      .map((li) => li.querySelector<HTMLImageElement>("img"))
      .filter((img): img is HTMLImageElement => img !== null);
    const sizesPrevios = imagenes.map((img) => img.getAttribute("sizes"));
    for (const img of imagenes) img.setAttribute("sizes", "100vw");

    // Distancia como función: se remide en cada refresh (fuente cargada,
    // resize), igual que el `x` que la usa.
    const distancia = () => ol.scrollWidth - innerWidth;

    const horizontal = gsap.to(ol, {
      x: () => -distancia(),
      ease: "none",
      scrollTrigger: {
        trigger: seccion,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        end: () => "+=" + distancia(),
      },
    });

    for (const li of musicos) {
      const img = li.querySelector<HTMLImageElement>("img");
      if (!img) continue;

      gsap.fromTo(
        img,
        { scale: 1.08 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: li,
            containerAnimation: horizontal,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        },
      );
    }

    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    // Foco de teclado dentro de la fila: un músico fuera de pantalla (a la
    // derecha o la izquierda de la traslación) puede recibir foco igual
    // (Tab no sabe de `x`); sin esto, el usuario de teclado queda enfocado
    // en algo que no ve. Cada músico ocupa una fracción igual del recorrido
    // del pin, así que su posición de scroll es una interpolación lineal
    // entre el inicio y el fin del ScrollTrigger según su índice.
    const alEnfocar = (evento: FocusEvent) => {
      const li = (evento.target as HTMLElement | null)?.closest<HTMLElement>(".musico");
      if (!li) return;
      const indice = musicos.indexOf(li);
      const st = horizontal.scrollTrigger;
      if (indice < 0 || !st || musicos.length < 2) return;

      const progreso = indice / (musicos.length - 1);
      const destino = st.start + progreso * (st.end - st.start);
      // `scrollAPosicion` (no `window.scrollTo` directo): si Lenis está a
      // mitad de un ease por una rueda/touch reciente, un salto nativo no
      // le gana — sigue tirando hacia su target viejo y el pin rebota.
      scrollAPosicion(destino);
    };
    seccion.addEventListener("focusin", alEnfocar);

    return () => {
      seccion.removeEventListener("focusin", alEnfocar);
      seccion.removeAttribute("data-fila");
      for (let i = 0; i < imagenes.length; i++) {
        const previo = sizesPrevios[i];
        if (previo) imagenes[i].setAttribute("sizes", previo);
      }
      // El contexto de mm ya revierte los tweens/ScrollTrigger; esto es un
      // resguardo extra (mismo criterio que portada.ts) por si algo quedó
      // con un transform inline a mitad de cuadro.
      gsap.set(ol, { clearProps: "transform" });
      gsap.set(imagenes, { clearProps: "transform" });
    };
  });
}
