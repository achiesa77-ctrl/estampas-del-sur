import { expect, test, type Page } from "@playwright/test";

// El Grupo (spec §3 fila 2, papel): presentación + cifras (contador) +
// ritmos. Ambiente papel con cruce de color (ambientes.ts).
const grupo = (page: Page) => page.locator("#grupo");
const cifras = (page: Page) => grupo(page).locator("[data-contador]");

/** La portada corre un timeline de ~4.5s con pin propio: los tests que
 * scrollean esperan su estado final primero (global.md). */
async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

test("título de la sección y ritmos visibles", async ({ page }) => {
  await irAFin(page);
  await grupo(page).scrollIntoViewIfNeeded();
  await expect(grupo(page).getByRole("heading", { name: "El grupo" })).toBeVisible();
  await expect(grupo(page).getByRole("listitem").filter({ hasText: "Milonga" })).toBeVisible();
});

test("las cifras cuentan hasta 15, 3 y 4", async ({ page }) => {
  await irAFin(page);
  // Las cifras van al pie de la sección: hace falta llevarlas a la vista
  // (no sólo el borde superior de #grupo) para que el ScrollTrigger
  // dispare el conteo.
  await cifras(page).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000); // 1.2s de conteo + margen
  await expect(cifras(page)).toHaveText(["15", "3", "4"]);
});

test("el revelado de líneas respeta el interlineado del párrafo (no el gap entre párrafos)", async ({
  page,
}) => {
  await irAFin(page);
  const primerParrafo = grupo(page).locator(".grupo__presentacion p").first();
  const lineas = primerParrafo.locator(".linea");
  await expect(lineas.nth(1)).toBeVisible(); // el párrafo ocupa varias líneas

  const { pitch, lineHeight } = await primerParrafo.evaluate((p) => {
    const cajas = Array.from(p.querySelectorAll<HTMLElement>(".linea")).map(
      (el) => el.getBoundingClientRect().top,
    );
    return {
      pitch: cajas[1] - cajas[0],
      lineHeight: parseFloat(getComputedStyle(p).lineHeight),
    };
  });

  // Si el SplitText se hiciera sobre el contenedor entero (ambos párrafos
  // a la vez), el gap del grid se colaría entre cada línea y el pitch
  // quedaría muy por encima del line-height real del párrafo.
  expect(Math.abs(pitch - lineHeight) / lineHeight).toBeLessThan(0.1);
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("las cifras ya muestran el valor final, sin conteo", async ({ page }) => {
    await irAFin(page);
    await grupo(page).scrollIntoViewIfNeeded();
    await expect(cifras(page)).toHaveText(["15", "3", "4"]);
  });

  test("el fondo del body pasa a papel con #grupo en pantalla", async ({ page }) => {
    await irAFin(page);
    await grupo(page).scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .toBe("rgb(232, 226, 213)");
  });
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la presentación y las cifras están visibles con sus valores finales", async ({ page }) => {
    await page.goto("/");
    await expect(grupo(page).getByRole("heading", { name: "El grupo" })).toBeVisible();
    await expect(cifras(page)).toHaveText(["15", "3", "4"]);
  });
});
