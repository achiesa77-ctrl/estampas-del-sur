// Trayectoria (spec §3 fila 8): tira de negativos fijada en escritorio.
// Markup en src/components/Trayectoria.astro (por defecto: tira vertical,
// el estado final visible sin JS). Con motionOK && ancho, la tira pasa a
// fila y la sección se fija mientras la película corre en `x` — misma
// técnica que integrantes.ts —; el contador «Cuadro NN / 09» sigue el
// avance del pin y cada año deriva con un parallax leve.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { condiciones, mm } from "./motion";

const dosCifras = (n: number) => String(n).padStart(2, "0");

export function initTrayectoria(): void {
  const seccion = document.querySelector<HTMLElement>("#trayectoria");
  const ol = seccion?.querySelector<HTMLOListElement>(".tira");
  const actual = seccion?.querySelector<HTMLElement>(".tira__actual");
  if (!seccion || !ol || !actual) return;

  const cuadros = gsap.utils.toArray<HTMLElement>(".cuadro", ol);

  mm.add(condiciones, (ctx) => {
    const { motionOK, ancho } = ctx.conditions ?? {};
    if (!(motionOK && ancho)) return;

    seccion.setAttribute("data-tira", "");

    let indiceMostrado = 0;
    actual.textContent = dosCifras(1);

    // Cuadro según el avance del pin: 01 al entrar, el último al salir. (El
    // «más cercano al centro» geométrico no sirve: con la tira recién
    // fijada el centro de pantalla cae sobre el cuadro 02 y el contador
    // arrancaría mintiendo.)
    // Se lee del tween (no del ScrollTrigger) para seguir a la película que
    // se ve, que llega con el retraso del scrub, y no al scroll crudo.
    const actualizarContador = (progreso: number) => {
      const indice = Math.round(progreso * (cuadros.length - 1));
      if (indice === indiceMostrado) return;
      const avanza = indice > indiceMostrado;
      indiceMostrado = indice;
      actual.textContent = dosCifras(indice + 1);
      // El número entra desde el lado hacia el que corre la película.
      gsap.fromTo(
        actual,
        { yPercent: avanza ? 60 : -60, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.3, ease: "expo.out", overwrite: true },
      );
    };

    const distancia = () => ol.scrollWidth - innerWidth;

    const horizontal = gsap.to(ol, {
      x: () => -distancia(),
      ease: "none",
      onUpdate() {
        actualizarContador(this.progress());
      },
      scrollTrigger: {
        trigger: seccion,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        end: () => "+=" + distancia(),
      },
    });

    const anios = cuadros
      .map((li) => li.querySelector<HTMLElement>(".cuadro__anio"))
      .filter((el): el is HTMLElement => el !== null);

    anios.forEach((anio, i) => {
      gsap.fromTo(
        anio,
        { xPercent: 6 },
        {
          xPercent: -6,
          ease: "none",
          scrollTrigger: {
            trigger: cuadros[i],
            containerAnimation: horizontal,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        },
      );
    });

    ScrollTrigger.sort();
    ScrollTrigger.refresh();

    return () => {
      seccion.removeAttribute("data-tira");
      actual.textContent = dosCifras(1);
      // Resguardo extra (mismo criterio que integrantes.ts): el contexto de
      // mm ya revierte tweens y ScrollTrigger.
      gsap.set(ol, { clearProps: "transform" });
      gsap.set([actual, ...anios], { clearProps: "transform,opacity" });
    };
  });
}
