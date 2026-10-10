import { expect, test, type Page } from "@playwright/test";

// Integrantes (spec §3 fila 3, oscuro): travelling horizontal fijado en
// escritorio (≥ 900 px con movimiento); en móvil / reducido, columna
// vertical sin pin. Comportamiento en src/scripts/integrantes.ts.
const integrantes = (page: Page) => page.locator("#integrantes");
const musicos = (page: Page) => integrantes(page).locator(".musico");

/** La portada corre un timeline de ~4.5s con pin propio: los tests que
 * scrollean esperan su estado final primero (global.md). */
async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

/** True si el nodo pinneado por GSAP envuelve a #integrantes en un
 * `.pin-spacer` (lo crea ScrollTrigger con `pin: true`). */
function tienePinSpacer(page: Page) {
  return page.evaluate(
    () => document.querySelector("#integrantes")?.parentElement?.classList.contains("pin-spacer") ?? false,
  );
}

test.describe("escritorio (con movimiento)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  // El proyecto "mobile" fuerza isMobile/hasTouch: combinado con un viewport
  // de escritorio, Chrome rompe la emulación (innerWidth queda en 4x lo
  // pedido). No es un dispositivo real: estos casos son de escritorio.
  test.skip(({ isMobile }) => isMobile, "requiere un viewport de escritorio real, sin emulación táctil");

  test("título y los 5 músicos con nombre, rol y enlaces IG/FB", async ({ page }) => {
    await irAFin(page);
    await integrantes(page).scrollIntoViewIfNeeded();
    await expect(integrantes(page).getByRole("heading", { name: "Integrantes" })).toBeVisible();
    await expect(musicos(page)).toHaveCount(5);
    await expect(musicos(page).first().getByText("Guillermo Pérez")).toBeVisible();
    await expect(
      musicos(page).first().getByRole("link", { name: "Instagram de Estampas del Sur" }),
    ).toHaveAttribute("href", /instagram\.com\/estampasdelsur/);
    await expect(
      musicos(page).first().getByRole("link", { name: "Facebook de Estampas del Sur" }),
    ).toHaveAttribute("href", /facebook\.com/);
  });

  test("el pin se arma y scrollear lo suficiente deja al 3er músico en el viewport", async ({
    page,
  }) => {
    await irAFin(page);
    await integrantes(page).scrollIntoViewIfNeeded();
    await expect.poll(() => tienePinSpacer(page)).toBe(true);

    const tercero = musicos(page).nth(2);

    // Salto directo a la mitad del recorrido del pin (en vez de ir de a
    // pasos con mouse.wheel/scrollBy): el 3er músico, 3 de 5 cuadros, cae
    // justo ahí. Un solo salto es determinístico y no depende de cuánto
    // CPU le toque a este worker con la suite corriendo en paralelo.
    const distancia = await page.evaluate(() => {
      const ol = document.querySelector<HTMLElement>("#integrantes .elenco")!;
      return ol.scrollWidth - window.innerWidth;
    });
    await page.evaluate((d) => window.scrollBy(0, d / 2), distancia);

    await expect.poll(
      async () => {
        const caja = await tercero.boundingBox();
        const ancho = page.viewportSize()!.width;
        return !!caja && caja.x > -ancho * 0.25 && caja.x < ancho * 0.25;
      },
      { timeout: 4000 },
    ).toBe(true);
  });
});

test.describe("móvil (columna vertical)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("los 5 músicos quedan apilados (misma x) y sin .pin-spacer", async ({ page }) => {
    await irAFin(page);
    await integrantes(page).scrollIntoViewIfNeeded();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);

    const xs = await musicos(page).evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().x)),
    );
    expect(new Set(xs).size).toBe(1);
  });
});

test.describe("Review Focus 2: cruzar los 900px con el pin activo", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.skip(({ isMobile }) => isMobile, "requiere un viewport de escritorio real, sin emulación táctil");

  test("al achicar a 800px se quita el pin y la fila vuelve a columna; al volver a 1440 se recrea", async ({
    page,
  }) => {
    await irAFin(page);
    await integrantes(page).scrollIntoViewIfNeeded();
    await expect.poll(() => tienePinSpacer(page)).toBe(true);

    await page.setViewportSize({ width: 800, height: 900 });
    await expect.poll(() => tienePinSpacer(page), { timeout: 2000 }).toBe(false);

    const xs = await musicos(page).evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().x)),
    );
    expect(new Set(xs).size).toBe(1); // columna: los 5 comparten la misma x

    const altura = await integrantes(page).evaluate((el) => el.getBoundingClientRect().height);
    expect(altura).toBeLessThan(5 * 900);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => tienePinSpacer(page), { timeout: 2000 }).toBe(true);
  });
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("columna vertical, sin pin, a cualquier ancho", async ({ page }) => {
    await irAFin(page);
    await integrantes(page).scrollIntoViewIfNeeded();
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    const xs = await musicos(page).evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().x)),
    );
    expect(new Set(xs).size).toBe(1);
  });
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("los 5 músicos, sus roles y enlaces están visibles", async ({ page }) => {
    await page.goto("/");
    await expect(integrantes(page).getByRole("heading", { name: "Integrantes" })).toBeVisible();
    await expect(musicos(page)).toHaveCount(5);
    await expect(integrantes(page).getByText("Batería")).toBeVisible();
    await expect(
      musicos(page).last().getByRole("link", { name: "Instagram de Estampas del Sur" }),
    ).toBeVisible();
  });
});
