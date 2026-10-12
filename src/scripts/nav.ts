// Navegación (spec §3 fila 0, §6): anclajes suaves con foco repuesto,
// nav que se esconde al bajar y vuelve al subir, scrollspy y menú móvil.
import { pausarScroll, reanudarScroll, scrollA } from "./motion";

const UMBRAL = 8; // px de scroll antes de decidir dirección
const ANGOSTO = "(max-width: 1099px)";

export function initNav(): void {
  const nav = document.querySelector<HTMLElement>(".nav");
  const boton = nav?.querySelector<HTMLButtonElement>(".nav__boton");
  if (!nav || !boton) return;

  nav.setAttribute("data-js", "");
  const menuAbierto = () => nav.hasAttribute("data-abierto");

  // --- Menú móvil -------------------------------------------------------
  // Mientras está abierto, el resto de la página queda inerte: el foco no
  // puede escaparse detrás del panel.
  const hermanos = () => Array.from(document.body.children).filter((el) => el !== nav);

  function abrirMenu() {
    nav!.setAttribute("data-abierto", "");
    nav!.classList.remove("nav--oculta");
    boton!.setAttribute("aria-expanded", "true");
    for (const el of hermanos()) (el as HTMLElement).inert = true;
    pausarScroll();
  }

  function cerrarMenu({ devolverFoco }: { devolverFoco: boolean }) {
    if (!menuAbierto()) return;
    nav!.removeAttribute("data-abierto");
    boton!.setAttribute("aria-expanded", "false");
    for (const el of hermanos()) (el as HTMLElement).inert = false;
    reanudarScroll();
    if (devolverFoco) boton!.focus();
  }

  boton.addEventListener("click", () => {
    if (menuAbierto()) cerrarMenu({ devolverFoco: false });
    else abrirMenu();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && menuAbierto()) cerrarMenu({ devolverFoco: true });
  });

  window.matchMedia(ANGOSTO).addEventListener("change", (evento) => {
    if (!evento.matches) cerrarMenu({ devolverFoco: false });
  });

  // --- Anclajes ---------------------------------------------------------
  // Delegado en el documento: cubre el nav, el enlace «Ir al contenido» y
  // cualquier CTA interno (#contacto, etc.).
  document.addEventListener("click", (evento) => {
    if (evento.defaultPrevented || evento.button !== 0) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    const enlace = (evento.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    const id = enlace?.hash.slice(1);
    if (!enlace || !id) return;
    const destino = document.getElementById(decodeURIComponent(id));
    if (!destino) return;

    evento.preventDefault();
    cerrarMenu({ devolverFoco: false }); // antes de scrollA: Lenis detenido ignora scrollTo
    scrollA(destino);
    if (location.hash !== enlace.hash) history.pushState(null, "", enlace.hash);
  });

  // --- Ocultar al bajar / mostrar al subir ------------------------------
  let ultimoY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const delta = y - ultimoY;
      if (Math.abs(delta) < UMBRAL) return;
      ultimoY = y;
      const ocultar =
        delta > 0 && y > nav.offsetHeight && !menuAbierto() && !nav.matches(":focus-within");
      nav.classList.toggle("nav--oculta", ocultar);
    },
    { passive: true },
  );

  nav.addEventListener("focusin", () => nav.classList.remove("nav--oculta"));

  // --- Scrollspy --------------------------------------------------------
  // La sección «actual» es la que cruza una línea a 40% del alto de la
  // ventana; se marcan con aria-current todos los enlaces del nav a ella.
  const enlacesNav = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  const secciones = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"));

  function marcar(id: string) {
    for (const enlace of enlacesNav) {
      if (enlace.hash === `#${id}` && !enlace.classList.contains("nav__emblema")) {
        enlace.setAttribute("aria-current", "true");
      } else {
        enlace.removeAttribute("aria-current");
      }
    }
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) marcar(entrada.target.id);
      }
    },
    { rootMargin: "-40% 0px -60% 0px" },
  );
  for (const seccion of secciones) observador.observe(seccion);
}
