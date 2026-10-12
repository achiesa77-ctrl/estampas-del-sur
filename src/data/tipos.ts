// Tipos de la capa de datos. Los textos reales viven en los demás módulos
// de src/data (migrados de `git show main:index.html`), este archivo sólo
// define sus formas.

export interface Cifra {
  valor: number;
  etiqueta: string;
}

export interface Grupo {
  nombre: string;
  ciudad: string;
  departamento: string;
  fundacion: number;
  presentacion: string[];
  cifras: Cifra[];
  ritmos: string[];
  historia: string[];
}

export interface Integrante {
  nombre: string;
  rol: string;
  /** Slug del archivo en src/assets/fotos/bn (lo produce la Tarea 3), sin ruta ni extensión. */
  foto: string;
  alt: string;
}

export interface Hito {
  anio: number;
  titulo: string;
  texto: string;
}

export interface Tema {
  titulo: string;
  /** Ruta pública del audio/video, ej. "/repertorio/1.mp4". */
  archivo: string;
  duracion: string;
}

export interface Video {
  id: string;
  titulo: string;
  anio?: number;
}

export interface Credencial {
  titulo: string;
  anio: number;
}

export interface Whatsapp {
  numero: string;
  url: string;
}

export interface Redes {
  instagram: string;
  facebook: string;
  whatsapp: Whatsapp;
  mail: string;
}

export interface Fecha {
  fecha: string;
  lugar: string;
  ciudad: string;
}
