// Fuente: git show main:index.html:290-339 (presentación/cifras), 448-487
// (historia). Corregido según spec §7: fundación 2011 en Pando, Canelones
// (el legacy llegó a contradecirse con "fines de 2010 en Empalme Olmos";
// ese dato está descartado).
import type { Grupo } from "./tipos";

export const grupo: Grupo = {
  nombre: "Estampas del Sur",
  ciudad: "Pando",
  departamento: "Canelones",
  fundacion: 2011,
  presentacion: [
    "El origen de Estampas del Sur se remonta a 2011, en Pando, Canelones, con una formación distinta a la actual. Con los años el proyecto se fue consolidando —integrantes que llegaron y otros que siguieron su camino— pero siempre con la misma inquietud: hacer música propia.",
    "Su marca es la autoría. Canciones originales atravesadas por pequeñas «muletillas» —un pasaje, un acorde— que funcionan como firma. Una identidad ligada al campo y al paisaje, que en el escenario se adapta al público entre milonga, chamarrita, polka y cumbia folklórica.",
  ],
  cifras: [
    { valor: 15, etiqueta: "años en escena" },
    { valor: 3, etiqueta: "videoclips propios" },
    { valor: 4, etiqueta: "ritmos propios" },
  ],
  ritmos: ["Milonga", "Chamarrita", "Polka", "Cumbia folklórica"],
  historia: [
    "Nacimos en 2011, en la ciudad de Pando, Canelones, con un objetivo tan simple como profundo: compartir nuestra música, nuestras raíces.",
    "A lo largo del camino llegaron los reconocimientos. En 2016 ganamos el Arco de Córdoba, en Argentina, por nuestra labor cultural. En 2017 nos quedamos con el primer premio en el Festival del Mate, en San José, y con el segundo en el Festival del Olimar, en Treinta y Tres; ese mismo año nos declararon de Interés Cultural y Municipal la Intendencia de Canelones.",
    "En 2018 editamos nuestro primer CD, «Savia Nueva», con el sello Productora Hipocampo; ese mismo año estrenamos nuestro primer videoclip, «Historias del Pasado». En 2019 representamos a Uruguay y a Canelones en el Festival Nacional de Folklore de Cosquín, con presentaciones en tres de sus principales escenarios, además de varias peñas tradicionales. Cerramos ese año ganando el Certamen de Canción Inédita de la Intendencia de Canelones.",
    "Vinieron nuevos videoclips: «Sacudiendo el Ser Humano» en 2022, «Soy Uruguayo» en 2024 —este último nos valió una nominación a los Premios Graffiti—. Y en 2026 editamos nuestro segundo disco, «Soy Uruguayo», integrado enteramente por canciones de autoría propia.",
    "Seguimos apostando a crecer, llevando nuestra música a nuevos escenarios, atentos a cada oportunidad de seguir recorriendo este hermoso camino musical.",
  ],
};
