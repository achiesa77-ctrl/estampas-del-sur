// Fuente: las 9 fotos del slideshow de `git show main:index.html:791-890`
// (g1–g9). Allá todas decían «Estampas del Sur en vivo»; acá cada una se
// describe por lo que muestra (spec §6), sin nombrar a nadie que la foto
// no permita identificar con certeza. g3, g4 y g8 repiten el texto de sus
// epígrafes en Historia.
export interface FotoGaleria {
  /** Slug del archivo en src/assets/fotos/bn, sin extensión. */
  foto: string;
  alt: string;
}

export const galeria: FotoGaleria[] = [
  {
    foto: "g1",
    alt: "Un integrante sonríe al aire libre, bajo un árbol, con la guitarra colgada.",
  },
  {
    foto: "g2",
    alt: "Los cinco integrantes se sacan una foto en el escenario, con el público de un festival nocturno detrás.",
  },
  {
    foto: "g3",
    alt: "Seis músicos posan en un living, con guitarras, acordeón y objetos de mate sobre la mesa.",
  },
  {
    foto: "g4",
    alt: "Primer plano de perfil de un integrante, de noche, entre humo y luces de escenario.",
  },
  {
    foto: "g5",
    alt: "Un guitarrista toca de pie junto al río, a plena luz del día.",
  },
  {
    foto: "g6",
    alt: "El bajista toca junto al río, con el agua y el monte detrás.",
  },
  {
    foto: "g7",
    alt: "Un acordeonista sonríe mientras toca, con un teclado delante.",
  },
  {
    foto: "g8",
    alt: "Dos integrantes tocan en un escenario nocturno: uno canta con la guitarra de pie, el otro toca el acordeón sentado.",
  },
  {
    foto: "g9",
    alt: "La banda completa en un escenario grande de festival, con una pantalla gigante detrás.",
  },
];
