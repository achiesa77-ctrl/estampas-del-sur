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
