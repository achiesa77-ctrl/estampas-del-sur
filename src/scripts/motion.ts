// Motor de movimiento (spec §5, §6): un solo reloj GSAP↔Lenis y un único
// gsap.matchMedia compartido. Los demás módulos registran sus animaciones
// con `mm.add(condiciones, …)` para que todo se revierta junto cuando
// cambia la preferencia de movimiento o el ancho.
//
// Lecciones del sitio anterior que se respetan acá:
// - Un solo reloj: Lenis avanza desde gsap.ticker; nunca un rAF aparte.
// - lenis.scrollTo(destino) SIN offset: Lenis ya lee scroll-margin-top.
// - Los anclajes hacen preventDefault, así que el foco se repone a mano.
// - Con el menú abierto no alcanza overflow:hidden: hay que lenis.stop().
// - Con movimiento reducido Lenis no se crea.
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

/** Condiciones de `mm`. Uso: `mm.add(condiciones, (ctx) => ctx.conditions?.motionOK …)`. */
export const condiciones = {
  motionOK: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
  ancho: "(min-width: 900px)",
} as const;

export const mm: gsap.MatchMedia = gsap.matchMedia();

let lenis: Lenis | null = null;
// Contador de bloqueos de scroll (menú, portada, visor…): el scroll vuelve
// sólo cuando TODOS los que pausaron reanudaron. Nunca baja de 0.
let pausas = 0;

export const reduceMotion = (): boolean => window.matchMedia(condiciones.reduce).matches;

export function initMotion(): void {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

  // Sólo depende de motionOK: cruzar los 900px no debe recrear Lenis.
  mm.add(condiciones.motionOK, () => {
    const instancia = new Lenis({ autoRaf: false });
    const avanzar = (tiempo: number) => instancia.raf(tiempo * 1000);

    gsap.ticker.add(avanzar);
    gsap.ticker.lagSmoothing(0);
    instancia.on("scroll", ScrollTrigger.update);
    if (pausas > 0) instancia.stop();
    lenis = instancia;

    return () => {
      gsap.ticker.remove(avanzar);
      gsap.ticker.lagSmoothing(500, 33); // valores por defecto de GSAP
      instancia.destroy();
      if (lenis === instancia) lenis = null;
    };
  });
}

/** Lleva `destino` bajo el nav (manda su scroll-margin-top) y le pasa el foco. */
export function scrollA(destino: Element): void {
  if (lenis) {
    lenis.scrollTo(destino as HTMLElement);
  } else {
    // Sin Lenis (movimiento reducido): salto nativo, también respeta scroll-margin.
    destino.scrollIntoView({ block: "start" });
  }

  if (destino instanceof HTMLElement) {
    if (!destino.hasAttribute("tabindex")) destino.setAttribute("tabindex", "-1");
    destino.focus({ preventScroll: true });
  }
}

/** Bloquea el scroll de la página (menú abierto, visor, entrada de la portada). */
export function pausarScroll(): void {
  pausas += 1;
  if (pausas > 1) return;
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";
}

/** Devuelve un bloqueo; el scroll vuelve cuando no queda ninguno. */
export function reanudarScroll(): void {
  if (pausas === 0) return;
  pausas -= 1;
  if (pausas > 0) return;
  document.documentElement.style.overflow = "";
  lenis?.start();
}
