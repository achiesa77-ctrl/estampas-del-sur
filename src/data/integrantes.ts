// Fuente: git show main:index.html:342-445. Orden original de las cards.
// `foto` es el slug que la Tarea 3 produce en src/assets/fotos/bn (mismo
// slug que usaban los archivos fotos/<slug>.webp del sitio legacy).
import type { Integrante } from "./tipos";

export const integrantes: Integrante[] = [
  {
    nombre: "Guillermo Pérez",
    rol: "Bajo",
    foto: "guillermo-perez",
    alt: "Guillermo Pérez, bajista de Estampas del Sur",
  },
  {
    nombre: "Marcelo Marrero",
    rol: "Primera voz · Segunda guitarra",
    foto: "marcelo-marrero",
    alt: "Marcelo Marrero, primera voz y segunda guitarra de Estampas del Sur",
  },
  {
    nombre: "Fernando Saavedra",
    rol: "Primera guitarra · Segunda voz",
    foto: "fernando-saavedra",
    alt: "Fernando Saavedra, primera guitarra y segunda voz de Estampas del Sur",
  },
  {
    nombre: "Henry Acuña",
    rol: "Acordeón y teclados",
    foto: "henry-acuna",
    alt: "Henry Acuña, acordeón y teclados de Estampas del Sur",
  },
  {
    nombre: "Diego Rodríguez",
    rol: "Batería",
    foto: "diego-rodriguez",
    alt: "Diego Rodríguez, baterista de Estampas del Sur",
  },
];
