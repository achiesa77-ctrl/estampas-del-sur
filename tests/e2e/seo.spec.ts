import { expect, test } from "@playwright/test";

test("el JSON-LD describe a Estampas del Sur como MusicGroup", async ({ page }) => {
  await page.goto("/");
  const texto = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(texto).toBeTruthy();
  const datos = JSON.parse(texto ?? "");
  expect(datos["@type"]).toBe("MusicGroup");
  expect(datos.name).toBe("Estampas del Sur");
});

test("og:image es una URL absoluta", async ({ page }) => {
  await page.goto("/");
  const contenido = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(contenido).toMatch(/^https:\/\//);
});

test('el enlace «Ir al contenido» es el primer foco con Tab y apunta a #contenido', async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const enlace = page.getByRole("link", { name: "Ir al contenido" });
  await expect(enlace).toBeFocused();
  await expect(enlace).toHaveAttribute("href", "#contenido");
});
