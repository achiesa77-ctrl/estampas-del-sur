import { expect, test, type Page } from "@playwright/test";

// Cruce de ambientes (spec §2.1, src/scripts/ambientes.ts): la sección que
// ENTRA funde su fondo y su texto desde el ambiente anterior al suyo; la
// que se está leyendo conserva siempre su fondo propio. Antes el fundido
// se hacía en el <body> con las secciones transparentes, y a mitad de
// camino quedaba un gris donde ningún texto llegaba a contraste AA (visto
// en la verificación final con «Próximas fechas» arriba de la pantalla).

const PAPEL = "rgb(232, 226, 213)";
const OSCURO = "rgb(18, 17, 16)";
const TINTA = "rgb(28, 26, 23)";

async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

const fondo = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundColor);
const texto = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => getComputedStyle(el).color);

async function ponerArriba(page: Page, sel: string) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel)!;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  }, sel);
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });
    test.skip(
      ({ isMobile }) => isMobile && viewport.width > 900,
      "viewport de escritorio con emulación táctil no es un dispositivo real",
    );

    test("con «Próximas fechas» arriba, se lee sobre papel y sin gris intermedio", async ({
      page,
    }) => {
      await irAFin(page);
      await ponerArriba(page, "#agenda");
      await expect.poll(() => fondo(page, "#agenda")).toBe(PAPEL);
      await expect.poll(() => texto(page, "#agenda")).toBe(TINTA);
    });

    test("la galería termina de fundirse a oscuro cuando su título llega a la mitad", async ({
      page,
    }) => {
      await irAFin(page);
      await page.evaluate(() => {
        const el = document.querySelector("#galeria")!;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - innerHeight * 0.45);
      });
      await expect.poll(() => fondo(page, "#galeria")).toBe(OSCURO);
      await expect.poll(() => texto(page, "#galeria")).toBe(PAPEL);
      // La sección anterior no se tocó.
      await expect.poll(() => fondo(page, "#agenda")).toBe(PAPEL);
    });
  });
}
