import { expect, test, type Page } from "@playwright/test";

const nav = (page: Page) => page.getByRole("navigation", { name: "Principal" });
const botonMenu = (page: Page) => nav(page).getByRole("button", { name: "Menú" });

/** En anchos < 1100px los enlaces viven detrás del botón «Menú». */
async function abrirMenuSiHaceFalta(page: Page) {
  if (await botonMenu(page).isVisible()) {
    await botonMenu(page).click();
    await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "true");
  }
}

const topDe = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);

const esFoco = (page: Page, id: string) =>
  page.evaluate((id) => document.activeElement?.id === id, id);

test.describe("navegación con movimiento", () => {
  test("Lenis está activo (html.lenis)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/(^|\s)lenis(\s|$)/);
  });

  test("si la preferencia pasa a reduce en vivo, Lenis se destruye (y vuelve)", async ({
    page,
  }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/(^|\s)lenis(\s|$)/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(html).not.toHaveClass(/(^|\s)lenis(\s|$)/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(html).toHaveClass(/(^|\s)lenis(\s|$)/);
  });

  test("tiene 9 enlaces de sección y el CTA «Contrataciones» → #contacto", async ({ page }) => {
    await page.goto("/");
    const enlaces = nav(page).locator("ul a");
    await expect(enlaces).toHaveText([
      "El Grupo",
      "Integrantes",
      "Historia",
      "Repertorio",
      "El Disco",
      "Videos",
      "Trayectoria",
      "Próximas fechas",
      "Galería",
      "Contrataciones",
    ]);
    // Con el menú cerrado (móvil) los enlaces no están en el árbol accesible:
    // se busca por href, no por rol.
    await expect(nav(page).locator('a[href="#contacto"]')).toHaveText("Contrataciones");
  });

  test("clic en «Historia» lleva la sección bajo el nav y le pasa el foco", async ({ page }) => {
    await page.goto("/");
    await abrirMenuSiHaceFalta(page);
    await nav(page).getByRole("link", { name: "Historia" }).click();
    // El desplazamiento debe completarse dentro de 1.5s.
    await expect(async () => {
      const top = await topDe(page, "#historia");
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(80);
      expect(await esFoco(page, "historia")).toBe(true);
    }).toPass({ timeout: 1500 });
  });

  test("scrollspy marca con aria-current el enlace de la sección visible", async ({ page }) => {
    await page.goto("/");
    await abrirMenuSiHaceFalta(page);
    await nav(page).getByRole("link", { name: "Repertorio" }).click();
    await expect(nav(page).locator('a[aria-current="true"]')).toHaveAttribute(
      "href",
      "#repertorio",
    );
    await expect(nav(page).locator("a[aria-current]")).toHaveCount(1);
  });

  test("se oculta al bajar y reaparece al subir", async ({ page }) => {
    await page.goto("/");
    const elemento = nav(page);
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(elemento).toHaveClass(/nav--oculta/);
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(elemento).not.toHaveClass(/nav--oculta/);
  });

  test("el enlace «Ir al contenido» lleva el foco a #contenido", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect.poll(() => esFoco(page, "contenido")).toBe(true);
  });
});

test.describe("menú móvil", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("«Menú» abre, detiene Lenis, y Escape cierra devolviendo el foco", async ({ page }) => {
    await page.goto("/");
    const boton = botonMenu(page);
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
    await expect(nav(page).getByRole("link", { name: "Historia" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(boton).toBeFocused();
    await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
    await expect(nav(page).getByRole("link", { name: "Historia" })).toBeHidden();
  });

  test("un enlace del menú lo cierra y navega", async ({ page }) => {
    await page.goto("/");
    await botonMenu(page).click();
    await nav(page).getByRole("link", { name: "Galería" }).click();
    await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => esFoco(page, "galeria")).toBe(true);
    await expect
      .poll(async () => {
        const top = await topDe(page, "#galeria");
        return top >= 0 && top <= 80;
      })
      .toBe(true);
  });
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("no crea Lenis", async ({ page }) => {
    await page.goto("/");
    await expect(nav(page)).toHaveAttribute("data-js", "");
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)lenis(\s|$)/);
  });

  test("el anclaje usa scroll nativo respetando scroll-margin y pasa el foco", async ({
    page,
  }) => {
    await page.goto("/");
    await abrirMenuSiHaceFalta(page);
    await nav(page).getByRole("link", { name: "Trayectoria" }).click();
    await expect.poll(() => esFoco(page, "trayectoria")).toBe(true);
    const top = await topDe(page, "#trayectoria");
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(80);
  });

  test.describe("en móvil", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("el menú abierto bloquea el scroll con overflow:hidden", async ({ page }) => {
      await page.goto("/");
      await botonMenu(page).click();
      await expect(botonMenu(page)).toHaveAttribute("aria-expanded", "true");
      await expect
        .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow))
        .toBe("hidden");
      await page.keyboard.press("Escape");
      await expect(botonMenu(page)).toBeFocused();
      await expect
        .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow))
        .not.toBe("hidden");
    });
  });
});

test.describe("sin JavaScript, en angosto", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });

  test("los 9 enlaces y «Contrataciones» siguen alcanzables en la tira", async ({ page }) => {
    await page.goto("/");
    await expect(botonMenu(page)).toBeHidden();
    const cta = nav(page).getByRole("link", { name: "Contrataciones" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "#contacto");
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeInViewport({ ratio: 1 });
    await expect(nav(page).getByRole("link", { name: "El Grupo" })).toBeVisible();
  });
});
