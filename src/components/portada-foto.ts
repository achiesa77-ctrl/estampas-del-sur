// Opciones de la foto elegida de la portada (el LCP). Las comparten el
// <Picture> de Portada.astro y el <link rel="preload"> del <head>
// (index.astro): mismas opciones ⇒ mismas URLs, así la precarga apunta al
// archivo que el navegador realmente elige.
import { getImage } from "astro:assets";
import portada from "../assets/fotos/bn/portada.jpg";

export const fotoElegida = {
  src: portada,
  widths: [640, 960, 1280, 1600],
  // Se dibuja con object-fit:cover a sangre: en pantallas más angostas que
  // la foto (50/29 = 1600/928) el ancho real es el alto × 1.7241, no 100vw.
  sizes: "(max-aspect-ratio: 50/29) 173vh, 100vw",
  formats: ["avif", "webp"] as ("avif" | "webp")[],
};

/** Atributos del preload: AVIF (primer <source>, lo que elige todo navegador actual). */
export async function precargaElegida() {
  const imagen = await getImage({
    src: fotoElegida.src,
    widths: fotoElegida.widths,
    format: "avif",
  });
  return {
    imagesrcset: imagen.srcSet.attribute,
    imagesizes: fotoElegida.sizes,
    type: "image/avif",
  };
}
