// Revelado de contenido (spec §2.1, §3): modos reutilizables que cada
// sección activa con un atributo. initRevelado() es el único punto de
// entrada; despacha a una función privada por modo. Tareas futuras
// agregan más modos (copia, trazo, creditos) como nuevas funciones
// privadas, llamadas desde el mismo initRevelado().
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { condiciones, mm } from "./motion";

const DURACION_CONTADOR = 1.2;

function leerToken(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

/** [data-revelar="lineas"]: cada línea del texto pasa de --lapiz a
 *  --tinta a medida que se desplaza por la franja de lectura. */
function revelarLineas(): void {
  const contenedores = gsap.utils.toArray<HTMLElement>('[data-revelar="lineas"]');
  if (!contenedores.length) return;

  mm.add({ motionOK: condiciones.motionOK, reduce: condiciones.reduce }, (ctx) => {
    const { motionOK } = ctx.conditions ?? {};
    // Reduce: el color del ambiente (--tinta) ya es el estado final; no
    // hay nada que revelar.
    if (!motionOK) return;

    const lapiz = leerToken("--lapiz");
    const tinta = leerToken("--tinta");

    for (const contenedor of contenedores) {
      // Un SplitText por bloque (cada <p>), no por el contenedor entero:
      // si se splittea el contenedor completo, los wrappers de línea
      // quedan como hijos directos de su grid y el gap entre párrafos se
      // cuela entre cada línea (hallazgo de revisión); además el
      // aria-label que arma SplitText concatena el texto de los dos
      // párrafos sin espacio. Partiendo por bloque, cada línea queda
      // anidada dentro de su propio párrafo y el espaciado entre líneas
      // lo da sólo el line-height de ese párrafo.
      const bloques = contenedor.children.length
        ? (Array.from(contenedor.children) as HTMLElement[])
        : [contenedor];

      for (const bloque of bloques) {
        SplitText.create(bloque, {
          type: "lines",
          linesClass: "linea",
          autoSplit: true, // re-split en resize/carga de fuente
          onSplit(self) {
            return gsap.fromTo(
              self.lines,
              { color: lapiz },
              {
                color: tinta,
                ease: "none",
                stagger: 0.05,
                scrollTrigger: {
                  trigger: contenedor,
                  start: "top 80%",
                  end: "bottom 55%",
                  scrub: true,
                },
              },
            );
          },
        });
      }
    }
    // autoSplit re-crea su propia animación en cada re-split; el revert
    // de mm (SplitText + ScrollTrigger quedan en el contexto) limpia todo.
  });
}

/** [data-contador]: cuenta de 0 al valor final una sola vez al entrar en
 *  pantalla. El valor final vive en el propio HTML (estado final visible
 *  sin JS); se lee una sola vez, antes de que el contador lo sobrescriba. */
function revelarContadores(): void {
  const elementos = gsap.utils.toArray<HTMLElement>("[data-contador]");
  if (!elementos.length) return;

  for (const el of elementos) {
    const destino = Number(el.textContent?.replace(/\D/g, "") || "0");
    el.dataset.valor = String(destino);
    // Nombre accesible fijo: evita que un lector de pantalla anuncie un
    // valor parcial mientras el contador está en movimiento.
    el.setAttribute("aria-label", String(destino));
  }

  mm.add({ motionOK: condiciones.motionOK, reduce: condiciones.reduce }, (ctx) => {
    const { motionOK } = ctx.conditions ?? {};

    for (const el of elementos) {
      const destino = Number(el.dataset.valor);
      el.textContent = motionOK ? "0" : String(destino);
      if (!motionOK) continue;

      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => {
          const proxy = { valor: 0 };
          gsap.to(proxy, {
            valor: destino,
            duration: DURACION_CONTADOR,
            ease: "power1.out",
            onUpdate: () => {
              el.textContent = String(Math.round(proxy.valor));
            },
          });
        },
      });
    }

    return () => {
      // Si el revert llega a mitad de cuadro, el texto no debe quedar
      // trunco: vuelve al valor final leído al principio.
      for (const el of elementos) el.textContent = el.dataset.valor ?? el.textContent;
    };
  });
}

/** [data-revelar="simple"]: aparición en bloque (opacidad + leve subida). */
function revelarSimple(): void {
  const elementos = gsap.utils.toArray<HTMLElement>('[data-revelar="simple"]');
  if (!elementos.length) return;

  mm.add({ motionOK: condiciones.motionOK, reduce: condiciones.reduce }, (ctx) => {
    const { motionOK } = ctx.conditions ?? {};

    ScrollTrigger.batch(elementos, {
      start: "top 85%",
      once: true,
      onEnter: (batch) =>
        gsap.fromTo(
          batch,
          motionOK ? { opacity: 0, y: 24 } : { opacity: 0 },
          motionOK
            ? { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.08 }
            : { opacity: 1, duration: 0.15, ease: "power1.out" },
        ),
    });
  });
}

/** [data-revelar="copia"]: copias impresas (Historia, spec §2.4/§3 fila 4)
 *  que caen a su rotación fija y «hacen foco» al entrar en pantalla. La
 *  rotación final y el CSS (--copia, sombra) ya dejan la copia en su
 *  estado final sin JS; acá sólo se anima la entrada. El foco se simula
 *  con una capa superior (`.copia__foco`, tono papel) que funde su
 *  opacidad de 1 a 0 — nunca `filter: blur` (prohibido por el contrato:
 *  blur en cada frame de scroll es carísimo y además re-flashea con
 *  movimiento reducido). */
function revelarCopias(): void {
  const copias = gsap.utils.toArray<HTMLElement>('[data-revelar="copia"]');
  if (!copias.length) return;

  mm.add({ motionOK: condiciones.motionOK, reduce: condiciones.reduce }, (ctx) => {
    const { motionOK } = ctx.conditions ?? {};

    for (const copia of copias) {
      const foco = copia.querySelector<HTMLElement>(".copia__foco");
      const rotacionFinal = Number(copia.dataset.rotacion ?? "0");

      if (!motionOK) {
        // Reduce: sólo opacidad, ≤200ms; sin caída ni rotación de más, y
        // la capa de foco no llega a mostrarse.
        if (foco) gsap.set(foco, { opacity: 0 });
        gsap.fromTo(
          copia,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.2,
            ease: "none",
            scrollTrigger: { trigger: copia, start: "top 90%", once: true },
          },
        );
        continue;
      }

      if (foco) gsap.set(foco, { opacity: 1 });

      ScrollTrigger.create({
        trigger: copia,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.fromTo(
            copia,
            { y: -40, rotation: rotacionFinal + 4 },
            { y: 0, rotation: rotacionFinal, duration: 0.9, ease: "power2.out" },
          );
          if (foco) {
            gsap.to(foco, { opacity: 0, duration: 0.6, delay: 0.25, ease: "power1.out" });
          }
        },
      });
    }
  });
}

export function initRevelado(): void {
  revelarLineas();
  revelarContadores();
  revelarSimple();
  revelarCopias();
}
