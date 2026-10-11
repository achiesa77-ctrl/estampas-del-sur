import { expect, test, type Page } from "@playwright/test";

// Galería (spec §3 fila 10, oscuro): hoja de contactos 3×3 con lupa al
// pasar el puntero y visor que se abre ampliando la miniatura (Flip).
// Comportamiento en src/scripts/galeria.ts.
const galeria = (page: Page) => page.locator("#galeria");
const contactos = (page: Page) => galeria(page).locator("a.contacto");
const visor = (page: Page) => page.locator("dialog.visor");
const imagenVisor = (page: Page) => visor(page).locator(".visor__img");

async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

test.describe("Galería", () => {
  test("9 contactos con aria-label «Ver foto N de 9: …» y numeración de fotograma", async ({
    page,
  }) => {
    await irAFin(page);
    await galeria(page).scrollIntoViewIfNeeded();
    await expect(galeria(page).getByRole("heading", { name: "Galería" })).toBeVisible();
    await expect(contactos(page)).toHaveCount(9);
    await expect(contactos(page).first()).toHaveAttribute("aria-label", /^Ver foto 1 de 9: /);
    await expect(contactos(page).nth(8)).toHaveAttribute("aria-label", /^Ver foto 9 de 9: /);
    await expect(galeria(page).locator(".contacto__num").first()).toHaveText(/01/);
  });

  test("clic en el 4.º abre el visor con g4; → pasa a g5; Escape cierra y el foco vuelve al 5.º", async ({
    page,
  }) => {
    await irAFin(page);
    await galeria(page).scrollIntoViewIfNeeded();

    await contactos(page).nth(3).click();
    await expect(visor(page)).toHaveAttribute("open", "");
    await expect(imagenVisor(page)).toHaveAttribute("src", /g4/);
    await expect(visor(page).locator(".visor__pie")).toContainText("Primer plano de perfil");

    await page.keyboard.press("ArrowRight");
    await expect(imagenVisor(page)).toHaveAttribute("src", /g5/);
    await expect(visor(page).locator(".visor__contador")).toHaveText("5 / 9");

    // Review Focus 5: el foco vuelve a la miniatura de la última foto vista.
    await page.keyboard.press("Escape");
    await expect(visor(page)).not.toHaveAttribute("open");
    await expect(contactos(page).nth(4)).toBeFocused();
  });

  test("botones Anterior/Siguiente dan la vuelta y Cerrar cierra", async ({ page }) => {
    await irAFin(page);
    await galeria(page).scrollIntoViewIfNeeded();

    await contactos(page).first().click();
    await expect(visor(page)).toHaveAttribute("open", "");
    await visor(page).getByRole("button", { name: "Anterior" }).click();
    await expect(imagenVisor(page)).toHaveAttribute("src", /g9/);
    await visor(page).getByRole("button", { name: "Siguiente" }).click();
    await expect(imagenVisor(page)).toHaveAttribute("src", /g1/);
    await visor(page).getByRole("button", { name: "Cerrar" }).click();
    await expect(visor(page)).not.toHaveAttribute("open");
    await expect(contactos(page).first()).toBeFocused();
  });

  test("con el visor abierto la página no scrollea por debajo", async ({ page }) => {
    await irAFin(page);
    await galeria(page).scrollIntoViewIfNeeded();
    await contactos(page).first().click();
    await expect(visor(page)).toHaveAttribute("open", "");
    const antes = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBe(antes);
  });

  test.describe("escritorio (puntero fino, con movimiento)", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test.skip(({ isMobile }) => isMobile, "la lupa es sólo para puntero fino");

    test("la lupa aparece sobre una miniatura con la misma foto, y se va al salir", async ({
      page,
    }) => {
      await irAFin(page);
      await galeria(page).scrollIntoViewIfNeeded();
      const lupa = galeria(page).locator(".lupa");
      await contactos(page).nth(1).hover();
      await expect(lupa).toHaveCSS("opacity", "1");
      await expect(lupa).toHaveCSS("background-image", /g2/);
      await page.mouse.move(5, 5);
      await expect(lupa).toHaveCSS("opacity", "0");
    });
  });

  test.describe("con movimiento reducido", () => {
    test.use({ reducedMotion: "reduce" });

    test("el visor abre y cierra igual, sin lupa", async ({ page }) => {
      await irAFin(page);
      await galeria(page).scrollIntoViewIfNeeded();
      await contactos(page).nth(2).hover();
      await expect(galeria(page).locator(".lupa")).toHaveCSS("opacity", "0");
      await contactos(page).nth(2).click();
      await expect(imagenVisor(page)).toHaveAttribute("src", /g3/);
      await page.keyboard.press("Escape");
      await expect(visor(page)).not.toHaveAttribute("open");
      await expect(contactos(page).nth(2)).toBeFocused();
    });
  });

  test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("cada contacto es un enlace a la foto grande", async ({ page }) => {
      await page.goto("/");
      await expect(contactos(page)).toHaveCount(9);
      await expect(contactos(page).first()).toHaveAttribute("href", /g1.*\.(webp|jpg)/);
      await expect(contactos(page).first()).toBeVisible();
    });
  });
});
