// Fuente: git show main:index.html:506-556. Los archivos viven en
// public/repertorio/ y se sirven por ruta pública. Duraciones dadas por el
// brief de la Tarea 2.
import type { Tema } from "./tipos";

export const temas: Tema[] = [
  { titulo: "Oficios", archivo: "/repertorio/1.mp4", duracion: "3:38" },
  { titulo: "Soy Uruguayo", archivo: "/repertorio/2.mp4", duracion: "3:48" },
  { titulo: "La Refalosa", archivo: "/repertorio/3.mpeg", duracion: "4:07" },
];
