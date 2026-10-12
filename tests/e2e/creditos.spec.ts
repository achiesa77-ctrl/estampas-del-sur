import { expect, test, type Page } from "@playwright/test";

// Contacto (sección #contacto, dentro de <main>) + créditos finales
// (<footer>, fuera de <main>: así sigue siendo el landmark contentinfo).
// Spec §3 fila 11. Revelado en src/scripts/revelado.ts (modo "creditos").
const contacto = (page: Page) => page.locator("#contacto");
const pie = (page: Page) => page.getByRole("contentinfo");

const NOMBRES = [
  "Guillermo Pérez",
  "Marcelo Marrero",
  "Fernando Saavedra",
  "Henry Acuña",
  "Diego Rodríguez",
];

async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

/** Baja hasta el fondo y se queda ahí. Repite el salto en cada intento:
 * si la página se vuelve a medir (llegan las fuentes, ScrollTrigger hace
 * refresh) el alto cambia y un único salto deja de ser "el fondo". */
async function alFondo(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        return Math.ceil(window.scrollY + innerHeight) >= document.documentElement.scrollHeight - 2;
      }),
    )
    .toBe(true);
}

test.describe("Contacto y créditos", () => {
  test("#contacto: título, WhatsApp con texto, mail e Instagram", async ({ page }) => {
    await irAFin(page);
    await contacto(page).scrollIntoViewIfNeeded();
    await expect(
      contacto(page).getByRole("heading", { name: "Contratá a Estampas del Sur" }),
    ).toBeVisible();
    await expect(contacto(page).getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/59895871148\?text=/,
    );
    await expect(contacto(page).getByRole("link", { name: /mail/i })).toHaveAttribute(
      "href",
      "mailto:estampasdelsur23@gmail.com",
    );
    await expect(contacto(page).getByRole("link", { name: /Instagram/ })).toHaveAttribute(
      "href",
      /instagram\.com\/estampasdelsur/,
    );
    // Está dentro de <main>; el pie no.
    await expect(page.locator("main #contacto")).toHaveCount(1);
    await expect(page.locator("main footer")).toHaveCount(0);
  });

  test("el pie lista los 5 integrantes con su rol, la ciudad, el año y la autoría", async ({
    page,
  }) => {
    await irAFin(page);
    await alFondo(page);
    const filas = pie(page).locator(".creditos__fila");
    await expect(filas).toHaveCount(5);
    for (const nombre of NOMBRES) await expect(pie(page)).toContainText(nombre);
    await expect(filas.first().locator("dt")).toHaveText("Bajo");
    await expect(filas.first().locator("dd")).toHaveText("Guillermo Pérez");
    await expect(pie(page)).toContainText("Pando, Canelones · Uruguay");
    await expect(pie(page)).toContainText("Creada por Alejandro Chiesa.");
    await expect(pie(page)).toContainText(String(new Date().getFullYear()));
    await expect(pie(page).getByRole("img", { name: "Estampas del Sur" })).toBeVisible();
  });

  test("al llegar al final de la página los créditos y el emblema terminan de entrar", async ({
    page,
  }) => {
    await irAFin(page);
    await alFondo(page);
    const ultimaFila = pie(page).locator(".creditos__fila").last();
    const emblema = pie(page).locator(".creditos__emblema");
    await expect.poll(() => ultimaFila.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await expect.poll(() => emblema.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await expect
      .poll(() => emblema.evaluate((el) => getComputedStyle(el).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });

  test.describe("con movimiento reducido", () => {
    test.use({ reducedMotion: "reduce" });

    test("las filas no se desplazan (sólo opacidad) y quedan visibles al final", async ({
      page,
    }) => {
      await irAFin(page);
      await alFondo(page);
      const fila = pie(page).locator(".creditos__fila").nth(2);
      await expect.poll(() => fila.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      await expect(fila).toHaveCSS("transform", "none");
    });
  });

  test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("todo el cierre se ve completo", async ({ page }) => {
      await page.goto("/");
      await expect(contacto(page).getByRole("link", { name: /WhatsApp/ })).toBeVisible();
      await pie(page).scrollIntoViewIfNeeded();
      await expect(pie(page).locator(".creditos__fila")).toHaveCount(5);
      await expect(pie(page).locator(".creditos__fila").last()).toBeVisible();
      await expect(pie(page)).toContainText("Creada por Alejandro Chiesa.");
    });
  });
});
