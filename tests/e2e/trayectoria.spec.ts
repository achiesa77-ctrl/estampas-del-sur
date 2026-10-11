import { expect, test, type Page } from "@playwright/test";

// Trayectoria (spec §3 fila 8, papel): tira de negativos con los 9 hitos.
// Por defecto (sin JS / móvil / movimiento reducido) la tira es vertical;
// con motionOK && ancho, src/scripts/trayectoria.ts la pone en fila, fija
// la sección y la desplaza en `x` con scrub (misma técnica que Integrantes).
const trayectoria = (page: Page) => page.locator("#trayectoria");
const cuadros = (page: Page) => trayectoria(page).locator(".tira > li");
const contador = (page: Page) => trayectoria(page).locator(".tira__contador");
const nav = (page: Page) => page.getByRole("navigation", { name: "Principal" });

const ANIOS = ["2011", "2016", "2017", "2018", "2019", "2020", "2022", "2024", "2026"];

/** La portada corre un timeline de ~4.5s con pin propio: los tests que
 * scrollean esperan su estado final primero (global.md). */
async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

function tienePinSpacer(page: Page, id: string) {
  return page.evaluate(
    (id) => document.getElementById(id)?.parentElement?.classList.contains("pin-spacer") ?? false,
    id,
  );
}

test.describe("Trayectoria", () => {
  test("título y 9 cuadros con los años 2011 → 2026 en orden", async ({ page }) => {
    await irAFin(page);
    await trayectoria(page).scrollIntoViewIfNeeded();
    await expect(trayectoria(page).getByRole("heading", { name: "Trayectoria" })).toBeAttached();
    await expect(cuadros(page)).toHaveCount(9);
    await expect(trayectoria(page).locator(".cuadro__anio")).toHaveText(ANIOS);
    await expect(cuadros(page).nth(2)).toContainText("Festival del Mate");
    // El contador es decorativo: el orden ya lo da la <ol>.
    await expect(contador(page)).toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("escritorio (con movimiento)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.skip(({ isMobile }) => isMobile, "requiere un viewport de escritorio real, sin emulación táctil");

  test("el pin se arma y al scrollear dentro el contador pasa de 01", async ({ page }) => {
    await irAFin(page);
    await trayectoria(page).scrollIntoViewIfNeeded();
    await expect.poll(() => tienePinSpacer(page, "trayectoria")).toBe(true);
    await expect(contador(page)).toBeVisible();
    await expect(contador(page)).toContainText("01");
    await expect(contador(page)).toContainText("09");

    const distancia = await page.evaluate(() => {
      const ol = document.querySelector<HTMLElement>("#trayectoria .tira")!;
      return ol.scrollWidth - window.innerWidth;
    });
    await page.evaluate((d) => window.scrollBy(0, d / 2), distancia);

    await expect
      .poll(async () => {
        const texto = (await contador(page).textContent()) ?? "";
        return Number(texto.match(/(\d+)\s*\//)?.[1] ?? 0);
      })
      .toBeGreaterThan(1);
  });

  test("al achicar a 800px se quita el pin y la tira vuelve a vertical", async ({ page }) => {
    await irAFin(page);
    await trayectoria(page).scrollIntoViewIfNeeded();
    await expect.poll(() => tienePinSpacer(page, "trayectoria")).toBe(true);

    await page.setViewportSize({ width: 800, height: 900 });
    await expect.poll(() => tienePinSpacer(page, "trayectoria"), { timeout: 2000 }).toBe(false);
    const xs = await cuadros(page).evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().x)),
    );
    expect(new Set(xs).size).toBe(1);
  });

  // Review Focus 3: el anclaje del menú hacia una sección con pin aterriza
  // en el inicio del pin, con el título y el primer cuadro a la vista.
  for (const { nombre, id, primero } of [
    { nombre: "Trayectoria", id: "trayectoria", primero: "#trayectoria .tira > li" },
    { nombre: "Integrantes", id: "integrantes", primero: "#integrantes .musico" },
  ]) {
    test(`clic en «${nombre}» del menú desde arriba: título y primer cuadro visibles`, async ({
      page,
    }) => {
      await irAFin(page);
      await expect.poll(() => tienePinSpacer(page, id)).toBe(true);
      await nav(page).getByRole("link", { name: nombre, exact: true }).click();

      await expect(async () => {
        const top = await page
          .locator(`#${id} h2`)
          .evaluate((el) => el.getBoundingClientRect().top);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(top).toBeLessThanOrEqual(200);
        await expect(page.locator(primero).first()).toBeInViewport();
      }).toPass({ timeout: 5000 });
    });

    // Con el pin ya pasado, el rect de la sección marca dónde terminó el
    // pin, no dónde empieza: scrollA() mide el .pin-spacer en su lugar.
    test(`clic en «${nombre}» desde el pie de página: también aterriza al inicio del pin`, async ({
      page,
    }) => {
      await irAFin(page);
      await expect.poll(() => tienePinSpacer(page, id)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(2000);
      // Al bajar el nav se esconde; subir un poco lo trae de vuelta.
      await page.evaluate(() => window.scrollBy(0, -300));
      await expect(nav(page)).not.toHaveClass(/nav--oculta/);
      await nav(page).getByRole("link", { name: nombre, exact: true }).click();

      await expect(async () => {
        const top = await page
          .locator(`#${id} h2`)
          .evaluate((el) => el.getBoundingClientRect().top);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(top).toBeLessThanOrEqual(200);
        await expect(page.locator(primero).first()).toBeInViewport();
      }).toPass({ timeout: 6000 });
    });
  }
});

test.describe("móvil (vertical)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("cuadros apilados, sin pin y sin contador", async ({ page }) => {
    await irAFin(page);
    await trayectoria(page).scrollIntoViewIfNeeded();
    await expect.poll(() => tienePinSpacer(page, "trayectoria")).toBe(false);
    const xs = await cuadros(page).evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().x)),
    );
    expect(new Set(xs).size).toBe(1);
    await expect(contador(page)).toBeHidden();
  });
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  test.skip(({ isMobile }) => isMobile, "requiere un viewport de escritorio real");

  test("vertical y sin pin aun en escritorio", async ({ page }) => {
    await irAFin(page);
    await trayectoria(page).scrollIntoViewIfNeeded();
    await expect.poll(() => tienePinSpacer(page, "trayectoria")).toBe(false);
    const xs = await cuadros(page).evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().x)),
    );
    expect(new Set(xs).size).toBe(1);
  });
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("los 9 hitos se leen completos", async ({ page }) => {
    await page.goto("/");
    await expect(trayectoria(page).getByRole("heading", { name: "Trayectoria" })).toBeVisible();
    await expect(cuadros(page)).toHaveCount(9);
    await expect(cuadros(page).last()).toContainText("Disco «Soy Uruguayo»");
    await expect(contador(page)).toBeHidden();
  });
});
