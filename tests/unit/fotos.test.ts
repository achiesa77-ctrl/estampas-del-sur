import sharp from "sharp";
import { describe, expect, it } from "vitest";

// Vitest corre desde la raíz del repo.
const raiz = "src/assets/fotos/";

const slugsBN = [
  "portada",
  "hero-franja",
  "acordeon",
  "g1",
  "g2",
  "g3",
  "g4",
  "g5",
  "g6",
  "g7",
  "g8",
  "g9",
  "guillermo-perez",
  "marcelo-marrero",
  "fernando-saavedra",
  "henry-acuna",
  "diego-rodriguez",
];

describe("fotos graduadas a blanco y negro", () => {
  it.each(slugsBN)("%s existe, es B/N y no supera 2400px", async (slug) => {
    const ruta = `${raiz}bn/${slug}.jpg`;
    const meta = await sharp(ruta).metadata(); // rechaza si el archivo no existe
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(2400);

    const { channels } = await sharp(ruta).stats();
    expect(channels.length).toBeGreaterThanOrEqual(3);
    const [r, g, b] = channels.map((c) => c.mean);
    expect(Math.abs(r - g)).toBeLessThan(1);
    expect(Math.abs(g - b)).toBeLessThan(1);
    expect(Math.abs(r - b)).toBeLessThan(1);
  });

  it("disco-soy-uruguayo se mantiene en color", async () => {
    const ruta = `${raiz}disco-soy-uruguayo.jpg`;
    const { channels } = await sharp(ruta).stats(); // rechaza si el archivo no existe
    const [r, g, b] = channels.map((c) => c.mean);
    expect(Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))).toBeGreaterThan(1);
  });
});
