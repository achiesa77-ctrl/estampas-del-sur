// Videos (spec §3 fila 7, oscuro): facade de miniatura → iframe de YouTube
// al clic. Puerto de `git show main:script.js:429-488` con dos cambios de
// la especificación de esta tarea: el host es youtube-nocookie.com (no
// youtube.com) y el foco al abrir va al iframe (no a un botón de cierre:
// acá no hay uno — abrir otro video es la única forma de cerrar el
// anterior, y ese cierre deja la miniatura abandonada visible y operable
// de nuevo, nunca destruida).
//
// Progresión: Videos.astro sirve cada tarjeta como <a href="…youtube.com/
// watch…">, un enlace real que funciona sin JS. `role="button"` sobre ese
// <a> no habría alcanzado (el navegador seguiría el href al activarlo en
// vez de abrir el facade, y Espacio no lo dispara como botón); en vez de
// servir un <a> y un <button> a la vez y ocultar uno con CSS (el patrón de
// Repertorio para el reproductor de audio), acá se REEMPLAZA el nodo: es el
// mismo control con el mismo contenido, sólo cambia qué hace al activarse,
// así que no tiene sentido descargar dos miniaturas por tarjeta.
interface VideoAbierto {
  boton: HTMLButtonElement;
  iframe: HTMLIFrameElement;
}

export function initVideos(): void {
  const seccion = document.getElementById("videos");
  const enlaces = Array.from(seccion?.querySelectorAll<HTMLAnchorElement>("a.video") ?? []);
  if (!seccion || !enlaces.length) return;

  seccion.setAttribute("data-js", "");

  // Astro scopea los estilos de Videos.astro con un atributo
  // `data-astro-cid-*` que agrega a cada nodo de su plantilla (así el hover
  // de la miniatura, por ejemplo, sólo aplica dentro de este componente).
  // El <button> y el <iframe> que arma este script no pasaron por esa
  // plantilla, así que sin este atributo sus reglas no les alcanzarían.
  const scopeAttr = Array.from(seccion.attributes).find((atributo) =>
    atributo.name.startsWith("data-astro-cid-"),
  )?.name;

  let abierto: VideoAbierto | null = null;

  function cerrarAbierto(): void {
    if (!abierto) return;
    abierto.iframe.remove();
    abierto.boton.hidden = false;
    abierto = null;
  }

  function abrir(boton: HTMLButtonElement): void {
    cerrarAbierto(); // un solo video a la vez: abrir otro cierra el anterior

    const id = boton.dataset.yt;
    if (!id) return;

    const iframe = document.createElement("iframe");
    iframe.className = "video__frame";
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1`;
    iframe.title = boton.dataset.titulo ?? "";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;
    if (scopeAttr) iframe.setAttribute(scopeAttr, "");

    boton.hidden = true; // oculta, no destruida: vuelve intacta al cerrar
    boton.insertAdjacentElement("afterend", iframe);
    abierto = { boton, iframe };
    iframe.focus();
  }

  for (const enlace of enlaces) {
    const boton = document.createElement("button");
    boton.type = "button";
    // Copia TODOS los atributos del enlace (clase, aria-label, data-yt,
    // data-titulo, el data-astro-cid-* de scope…) salvo href, que un botón
    // no usa.
    for (const atributo of Array.from(enlace.attributes)) {
      if (atributo.name === "href") continue;
      boton.setAttribute(atributo.name, atributo.value);
    }
    boton.innerHTML = enlace.innerHTML;

    enlace.replaceWith(boton);
    boton.addEventListener("click", () => abrir(boton));
  }
}
