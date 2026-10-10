import { expect, test, type Page } from "@playwright/test";

// Portada (spec §4): hoja de contactos → lápiz → zoom → título.
const portada = (page: Page) => page.locator(".portada");
const titulo = (page: Page) => page.getByRole("heading", { level: 1 });
const elegida = (page: Page) => page.locator(".hoja__elegida img");

test("?t=fin: estado final con el nombre del grupo", async ({ page }) => {
  await page.goto("/?t=fin");
  await expect(titulo(page)).toBeVisible();
  await expect(titulo(page)).toHaveText(/Estampas\s+del Sur/i);
  await expect(portada(page)).toHaveAttribute("data-estado", "final");
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("estado final directo: título, foto a pantalla completa y sin pin", async ({ page }) => {
    await page.goto("/");
    await expect(titulo(page)).toBeVisible();
    const ancho = page.viewportSize()!.width;
    const caja = await elegida(page).boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.width).toBeGreaterThanOrEqual(ancho * 0.95);
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
  });
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("el título está visible", async ({ page }) => {
    await page.goto("/");
    await expect(titulo(page)).toBeVisible();
  });
});

test("Review Focus 1: la rueda salta la entrada y luego desplaza la página", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(500);
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 400);
  await expect(portada(page)).toHaveAttribute("data-estado", "final", { timeout: 300 });
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 1500 })
    .toBeGreaterThan(0);
});

test("la foto elegida se precarga con el mismo archivo que usa la <img>", async ({ page }) => {
  await page.goto("/?t=fin");
  const img = elegida(page);
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.currentSrc)).not.toBe("");
  const actual = new URL(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).pathname;

  const precargas = await page
    .locator('link[rel="preload"][as="image"]')
    .evaluateAll((links) =>
      (links as HTMLLinkElement[]).flatMap((l) => [
        l.href,
        ...(l.imageSrcset || "").split(",").map((c) => c.trim().split(/\s+/)[0]),
      ]),
    );
  const rutas = precargas.filter(Boolean).map((u) => new URL(u, page.url()).pathname);
  expect(rutas).toContain(actual);
});

test("si el módulo llega después del respaldo de 6 s, la entrada no se repite", async ({ page }) => {
  test.setTimeout(45_000);
  // Retrasa todo JS empaquetado más allá del respaldo del script inline.
  await page.route("**/_astro/*.js", async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 9_000));
    await ruta.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  await expect(portada(page)).toHaveAttribute("data-estado", "final", { timeout: 8_500 });
  await expect(portada(page)).not.toHaveAttribute("data-hoja");

  await page.waitForFunction(() => window.__portada !== undefined, null, { timeout: 25_000 });
  const estado = await page.evaluate(() => ({
    progreso: window.__portada!.progress(),
    estado: document.querySelector(".portada")!.getAttribute("data-estado"),
    overflow: document.documentElement.style.overflow,
  }));
  expect(estado).toEqual({ progreso: 1, estado: "final", overflow: "" });
  await expect(titulo(page)).toBeVisible();
});

test("con el menú abierto, terminar la entrada no desbloquea el scroll", async ({ page }) => {
  // Angosto en ambos proyectos para que exista el botón «Menú».
  await page.setViewportSize({ width: 800, height: 900 });
  // ?t=1: entrada congelada (con el scroll pausado por la portada).
  await page.goto("/?t=1");
  await page.waitForFunction(() => window.__portada !== undefined);
  const html = page.locator("html");
  await expect(html).toHaveCSS("overflow", "hidden");

  const boton = page.getByRole("navigation", { name: "Principal" }).getByRole("button", { name: "Menú" });
  await boton.click();
  await expect(boton).toHaveAttribute("aria-expanded", "true");

  await page.evaluate(() => window.__portada!.progress(1)); // onComplete → reanudarScroll()
  await expect(portada(page)).toHaveAttribute("data-estado", "final");
  await expect(html).toHaveCSS("overflow", "hidden");
  await expect(html).toHaveClass(/lenis-stopped/);

  await page.keyboard.press("Escape");
  await expect(boton).toHaveAttribute("aria-expanded", "false");
  await expect(html).not.toHaveCSS("overflow", "hidden");
  await expect(html).not.toHaveClass(/lenis-stopped/);
});

test("el lápiz se dibuja progresivamente (a 1.6 s va por la mitad)", async ({ page }) => {
  await page.goto("/?t=1.6");
  const offset = await page
    .locator(".hoja__lapiz path")
    .evaluate((p) => parseFloat(getComputedStyle(p).strokeDashoffset));
  expect(offset).toBeGreaterThan(0.3);
  expect(offset).toBeLessThan(0.7);
});
