import { describe, expect, it } from "vitest";
import { credenciales } from "../../src/data/credenciales";
import { fechas } from "../../src/data/fechas";
import { grupo } from "../../src/data/grupo";
import { integrantes } from "../../src/data/integrantes";
import { redes } from "../../src/data/redes";
import { temas } from "../../src/data/temas";
import { trayectoria } from "../../src/data/trayectoria";
import { videos } from "../../src/data/videos";

describe("grupo", () => {
  it("nace en 2011, en Pando", () => {
    expect(grupo.fundacion).toBe(2011);
    expect(grupo.ciudad).toBe("Pando");
  });

  it("tiene las cifras 15/3/4", () => {
    expect(grupo.cifras.map((c) => c.valor)).toEqual([15, 3, 4]);
  });
});

describe("integrantes", () => {
  it("mantiene el orden original de la página", () => {
    expect(integrantes.map((i) => i.nombre)).toEqual([
      "Guillermo Pérez",
      "Marcelo Marrero",
      "Fernando Saavedra",
      "Henry Acuña",
      "Diego Rodríguez",
    ]);
  });
});

describe("trayectoria", () => {
  it("cubre los nueve hitos, de 2011 a 2026", () => {
    expect(trayectoria.map((h) => h.anio)).toEqual([
      2011, 2016, 2017, 2018, 2019, 2020, 2022, 2024, 2026,
    ]);
  });

  it("el hito de 2017 menciona los dos premios", () => {
    const hito2017 = trayectoria.find((h) => h.anio === 2017);
    expect(hito2017?.texto).toContain("Primer premio");
    expect(hito2017?.texto).toContain("segundo premio");
  });
});

describe("temas", () => {
  it("tiene los tres títulos del repertorio, en orden", () => {
    expect(temas.map((t) => t.titulo)).toEqual(["Oficios", "Soy Uruguayo", "La Refalosa"]);
  });
});

describe("videos", () => {
  it("tiene exactamente tres videos", () => {
    expect(videos.length).toBe(3);
  });
});

describe("integridad de los datos", () => {
  it("«Empalme Olmos» sólo aparece en el hito 2017, y «2010» en ninguna parte", () => {
    const hito2017 = trayectoria.find((h) => h.anio === 2017);
    const strings: string[] = [];

    const recolectar = (valor: unknown): void => {
      if (typeof valor === "string") {
        strings.push(valor);
      } else if (Array.isArray(valor)) {
        valor.forEach(recolectar);
      } else if (valor !== null && typeof valor === "object") {
        Object.values(valor).forEach(recolectar);
      }
    };

    recolectar({ grupo, integrantes, trayectoria, temas, videos, credenciales, redes, fechas });

    expect(hito2017?.texto).toContain("Empalme Olmos");

    const sinHito2017 = strings.filter((s) => s !== hito2017?.texto);
    for (const s of sinHito2017) {
      expect(s).not.toContain("Empalme Olmos");
      expect(s).not.toContain("2010");
    }
  });
});
