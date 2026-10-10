// Reproductor de audio del repertorio (spec §3 fila 5, oscuro; §6). Puerto
// de la lógica de `git show main:script.js:489-648`: un solo <audio>
// compartido (suena de a un tema a la vez), progreso con <input
// type="range"> y morph SVG play↔pausa animado con GSAP.
//
// El morph NO usa MorphSVGPlugin (no está en las dependencias permitidas):
// anima el atributo `d` como texto plano. Para que GSAP pueda interpolar
// los números de un `d` al otro, los dos paths (izquierdo y derecho) deben
// tener EXACTAMENTE la misma estructura de comandos en pausa y en play —
// por eso están escritos a mano como dos cuadriláteros "M x,y L x,y L x,y
// L x,y Z" cada uno: en pausa son las dos barras; en play, esos mismos
// cuatro puntos se cierran en un triángulo (el vértice derecho se repite
// dos veces, así el conteo de números no cambia).
import { gsap } from "gsap";
import { formatoTiempo } from "./formato";
import { reduceMotion } from "./motion";

export const PAUSA_IZQ = "M8,6 L10,6 L10,18 L8,18 Z";
export const PAUSA_DER = "M14,6 L16,6 L16,18 L14,18 Z";
export const PLAY_IZQ = "M8,5 L13,8.5 L13,15.5 L8,19 Z";
export const PLAY_DER = "M13,8.5 L18,12 L18,12 L13,15.5 Z";

const DURACION_MORPH = 0.18;

/** Morph play↔pausa de un botón (sus dos <path>). Con movimiento reducido,
 *  cambio instantáneo (sin tween): sólo un atributo que cambia, no hay
 *  movimiento que mueva el estómago. */
function morph(boton: HTMLElement, aPausa: boolean): void {
  const [izq, der] = boton.querySelectorAll("path");
  if (!izq || !der) return;
  const dIzq = aPausa ? PAUSA_IZQ : PLAY_IZQ;
  const dDer = aPausa ? PAUSA_DER : PLAY_DER;

  if (reduceMotion()) {
    izq.setAttribute("d", dIzq);
    der.setAttribute("d", dDer);
    return;
  }
  gsap.to(izq, { attr: { d: dIzq }, duration: DURACION_MORPH, ease: "power1.inOut" });
  gsap.to(der, { attr: { d: dDer }, duration: DURACION_MORPH, ease: "power1.inOut" });
}

export function initReproductor(): void {
  const filas = Array.from(document.querySelectorAll<HTMLLIElement>(".tema"));
  const audio = document.getElementById("repertorio-audio") as HTMLAudioElement | null;
  if (!filas.length || !audio) return;

  const botonDe = (fila: HTMLElement) => fila.querySelector<HTMLButtonElement>(".tema__play")!;
  const seekDe = (fila: HTMLElement) => fila.querySelector<HTMLInputElement>(".tema__seek")!;
  const errorDe = (fila: HTMLElement) => fila.querySelector<HTMLElement>(".tema__error");
  const duracionDe = (fila: HTMLElement) => fila.querySelector<HTMLElement>("[data-duracion]");
  const tituloDe = (fila: HTMLElement) => fila.querySelector(".tema__titulo")?.textContent?.trim() ?? "";

  // ---- Duración real: sondeo perezoso de metadata ----
  // No se precargan los tres archivos al cargar la página (preload="none"
  // en el markup); recién cuando la sección se acerca a pantalla se crea
  // un <audio> descartable por tema sólo para leer su duración real. Si el
  // observer nunca llega a disparar (p. ej. nadie scrollea), una red de
  // seguridad sondea igual a los 6s, una vez que la página ya terminó de
  // arrancar.
  let sondeado = false;
  const sondearDuraciones = () => {
    if (sondeado) return;
    sondeado = true;
    for (const fila of filas) {
      const archivo = fila.dataset.archivo;
      const destino = duracionDe(fila);
      if (!archivo || !destino) continue;
      const sonda = new Audio();
      sonda.preload = "metadata";
      sonda.src = archivo;
      sonda.addEventListener("loadedmetadata", () => {
        destino.textContent = formatoTiempo(sonda.duration);
      });
    }
  };
  const seccion = document.getElementById("repertorio");
  if (seccion && "IntersectionObserver" in window) {
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        observador.disconnect();
        sondearDuraciones();
      },
      { rootMargin: "600px 0px" },
    );
    observador.observe(seccion);
    setTimeout(sondearDuraciones, 6000);
  } else {
    sondearDuraciones();
  }

  // ---- Reproducción ----
  let actual: HTMLLIElement | null = null;
  let arrastrando = false;

  const pintar = (seek: HTMLInputElement) => {
    const max = Number(seek.max) || 0;
    const pct = max ? (Number(seek.value) / max) * 100 : 0;
    seek.style.setProperty("--pct", `${pct}%`);
  };

  const etiquetarValor = (seek: HTMLInputElement, fila: HTMLElement) => {
    const transcurrido = formatoTiempo(Number(seek.value));
    const total = duracionDe(fila)?.textContent ?? "--:--";
    seek.setAttribute("aria-valuetext", `${transcurrido} de ${total}`);
  };

  const ocultarError = (fila: HTMLElement) => {
    fila.classList.remove("tema--error");
    const error = errorDe(fila);
    if (error) error.hidden = true;
  };

  const mostrarError = (fila: HTMLElement) => {
    fila.classList.remove("tema--reproduciendo", "tema--cargando");
    fila.classList.add("tema--error");
    const error = errorDe(fila);
    if (error) error.hidden = false;
    const boton = botonDe(fila);
    boton.setAttribute("aria-pressed", "false");
    boton.setAttribute("aria-label", `Reproducir ${tituloDe(fila)}`);
    morph(boton, false);
  };

  // Deja una fila como si nunca se hubiera tocado (progreso 0, botón en
  // reposo): se usa al cambiar de pista, para la fila que se abandona.
  const reiniciarFila = (fila: HTMLLIElement | null) => {
    if (!fila) return;
    fila.classList.remove("tema--actual", "tema--reproduciendo", "tema--cargando");
    const seek = seekDe(fila);
    seek.value = "0";
    seek.disabled = true;
    pintar(seek);
    etiquetarValor(seek, fila);
    const boton = botonDe(fila);
    boton.setAttribute("aria-pressed", "false");
    boton.setAttribute("aria-label", `Reproducir ${tituloDe(fila)}`);
    morph(boton, false);
    ocultarError(fila);
  };

  const reproducir = (fila: HTMLLIElement) => {
    const archivo = fila.dataset.archivo;
    if (!archivo) return;

    if (actual === fila && !audio.paused) {
      audio.pause();
      return;
    }

    // Hace falta (re)cargar la fuente si es otra pista, o si esta misma
    // quedó en error (o el <audio> compartido quedó con error): un clic de
    // nuevo sobre la fila rota reintenta la carga en vez de llamar a
    // play() sobre un recurso que ya falló.
    const necesitaCargar = actual !== fila || fila.classList.contains("tema--error") || !!audio.error;
    if (necesitaCargar) {
      if (actual !== fila) reiniciarFila(actual);
      ocultarError(fila);
      audio.src = archivo;
      actual = fila;
      fila.classList.add("tema--actual", "tema--cargando");
    }

    const resultado = audio.play();
    if (resultado && typeof resultado.catch === "function") {
      resultado.catch((err: unknown) => {
        // AbortError: el usuario saltó a otro tema antes de que arrancara
        // éste. Es uso normal, no una falla: no hay que alarmarlo.
        if (err instanceof DOMException && err.name === "AbortError") return;
        mostrarError(fila);
      });
    }
  };

  for (const fila of filas) {
    botonDe(fila).addEventListener("click", () => reproducir(fila));

    const seek = seekDe(fila);
    // input: arrastre y flechas del teclado. Se marca "arrastrando" para
    // que timeupdate no le pelee el valor a la mano del usuario mientras
    // todavía no se confirmó el seek.
    seek.addEventListener("input", () => {
      if (actual !== fila || !Number.isFinite(audio.duration)) return;
      arrastrando = true;
      pintar(seek);
      etiquetarValor(seek, fila);
    });
    const confirmarSeek = () => {
      if (actual !== fila || !Number.isFinite(audio.duration)) return;
      audio.currentTime = Number(seek.value);
      arrastrando = false;
    };
    seek.addEventListener("change", confirmarSeek);
    seek.addEventListener("pointerup", confirmarSeek);
  }

  audio.addEventListener("loadedmetadata", () => {
    if (!actual) return;
    const seek = seekDe(actual);
    if (Number.isFinite(audio.duration)) {
      seek.max = String(audio.duration);
      seek.disabled = false;
      pintar(seek);
    }
    const destino = duracionDe(actual);
    if (destino) destino.textContent = formatoTiempo(audio.duration);
    etiquetarValor(seek, actual);
  });

  audio.addEventListener("timeupdate", () => {
    if (!actual || arrastrando) return;
    const seek = seekDe(actual);
    seek.value = String(audio.currentTime);
    pintar(seek);
    etiquetarValor(seek, actual);
  });

  // Buffer vacío a mitad de camino: vuelve el indicador de carga.
  audio.addEventListener("waiting", () => actual?.classList.add("tema--cargando"));
  audio.addEventListener("playing", () => actual?.classList.remove("tema--cargando"));
  audio.addEventListener("canplay", () => actual?.classList.remove("tema--cargando"));

  audio.addEventListener("error", () => {
    if (actual) mostrarError(actual);
  });

  audio.addEventListener("play", () => {
    if (!actual) return;
    for (const fila of filas) fila.classList.remove("tema--reproduciendo");
    actual.classList.add("tema--reproduciendo");
    actual.classList.remove("tema--cargando");
    const boton = botonDe(actual);
    boton.setAttribute("aria-pressed", "true");
    boton.setAttribute("aria-label", `Pausar ${tituloDe(actual)}`);
    morph(boton, true);
  });

  audio.addEventListener("pause", () => {
    if (!actual) return;
    actual.classList.remove("tema--reproduciendo");
    const boton = botonDe(actual);
    boton.setAttribute("aria-pressed", "false");
    boton.setAttribute("aria-label", `Reproducir ${tituloDe(actual)}`);
    morph(boton, false);
  });

  audio.addEventListener("ended", () => {
    if (!actual) return;
    actual.classList.remove("tema--reproduciendo", "tema--cargando");
    audio.currentTime = 0;
    const seek = seekDe(actual);
    seek.value = "0";
    pintar(seek);
    etiquetarValor(seek, actual);
  });

  // Estado inicial de cada fila: aria-valuetext coherente con la duración
  // de dato ya visible en el HTML (antes de que llegue cualquier metadata).
  for (const fila of filas) etiquetarValor(seekDe(fila), fila);
}
