import { expect, test, type Page } from "@playwright/test";

// Repertorio (spec §3 fila 5, oscuro): reproductor con un solo <audio>
// compartido (suena de a un tema), progreso como tira de película y morph
// SVG play↔pausa. Comportamiento en src/scripts/reproductor.ts (puerto de
// `git show main:script.js:489-648`).
const repertorio = (page: Page) => page.locator("#repertorio");
const filaDe = (page: Page, titulo: string) =>
  repertorio(page).locator(".tema", { hasText: titulo });
const botonDe = (page: Page, titulo: string) => filaDe(page, titulo).locator(".tema__play");

/** La portada corre un timeline de ~4.5s con pin propio: los tests que
 * scrollean esperan su estado final primero (global.md). */
async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

test.describe("Repertorio", () => {
  test("título y los tres temas, con su duración de dato", async ({ page }) => {
    await irAFin(page);
    await repertorio(page).scrollIntoViewIfNeeded();
    await expect(repertorio(page).getByRole("heading", { name: "Repertorio" })).toBeVisible();
    await expect(repertorio(page).locator(".tema")).toHaveCount(3);
    await expect(filaDe(page, "Oficios").locator("[data-duracion]")).toHaveText("3:38");
    await expect(filaDe(page, "Soy Uruguayo").locator("[data-duracion]")).toHaveText("3:48");
    await expect(filaDe(page, "La Refalosa").locator("[data-duracion]")).toHaveText("4:07");
  });

  test("clic en play de «Oficios» lo marca como reproduciendo (aria-pressed y aria-label)", async ({
    page,
  }) => {
    await irAFin(page);
    await repertorio(page).scrollIntoViewIfNeeded();

    const boton = botonDe(page, "Oficios");
    await boton.click();

    await expect(boton).toHaveAttribute("aria-pressed", "true");
    await expect(boton).toHaveAttribute("aria-label", "Pausar Oficios");
    await expect(filaDe(page, "Oficios")).toHaveClass(/tema--reproduciendo/);
  });

  test("clic en «Soy Uruguayo» corta «Oficios»: vuelve a aria-pressed=false", async ({ page }) => {
    await irAFin(page);
    await repertorio(page).scrollIntoViewIfNeeded();

    await botonDe(page, "Oficios").click();
    await expect(botonDe(page, "Oficios")).toHaveAttribute("aria-pressed", "true");

    await botonDe(page, "Soy Uruguayo").click();

    await expect(botonDe(page, "Soy Uruguayo")).toHaveAttribute("aria-pressed", "true");
    await expect(botonDe(page, "Oficios")).toHaveAttribute("aria-pressed", "false");
    await expect(botonDe(page, "Oficios")).toHaveAttribute("aria-label", "Reproducir Oficios");
    await expect(filaDe(page, "Oficios")).not.toHaveClass(/tema--reproduciendo/);
  });

  test("la barra de posición es operable con el teclado (flechas hacen seek)", async ({ page }) => {
    await irAFin(page);
    await repertorio(page).scrollIntoViewIfNeeded();

    await botonDe(page, "Oficios").click();
    const seek = filaDe(page, "Oficios").locator(".tema__seek");
    await expect(seek).toBeEnabled();

    await seek.focus();
    await seek.press("ArrowRight");
    await expect.poll(() => seek.inputValue()).not.toBe("0");
  });

  test("el objetivo táctil de la barra de posición mide al menos 44px de alto", async ({ page }) => {
    await irAFin(page);
    await repertorio(page).scrollIntoViewIfNeeded();
    const alto = await filaDe(page, "Oficios")
      .locator(".tema__seek")
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(alto).toBeGreaterThanOrEqual(44);
  });

  test("Review Focus 4: un audio que no carga marca la fila en error y aria-pressed=false", async ({
    page,
  }) => {
    await page.route("**/repertorio/1.mp4", (route) => route.abort());
    await irAFin(page);
    await repertorio(page).scrollIntoViewIfNeeded();

    const boton = botonDe(page, "Oficios");
    await boton.click();

    await expect(filaDe(page, "Oficios")).toHaveClass(/tema--error/, { timeout: 3000 });
    await expect(boton).toHaveAttribute("aria-pressed", "false", { timeout: 3000 });
    await expect(filaDe(page, "Oficios").getByText("No se pudo cargar el audio")).toBeVisible();
  });

  test("clicar de nuevo tras el error reintenta la carga", async ({ page }) => {
    // Bloquea TODOS los pedidos del archivo (el audio puede reintentar
    // varias veces el mismo recurso) hasta que el primer click ya dejó la
    // fila en error; recién ahí se deja pasar el pedido del segundo click.
    let bloqueando = true;
    await page.route("**/repertorio/1.mp4", (route) => (bloqueando ? route.abort() : route.continue()));
    await irAFin(page);
    await repertorio(page).scrollIntoViewIfNeeded();

    const boton = botonDe(page, "Oficios");
    await boton.click();
    await expect(filaDe(page, "Oficios")).toHaveClass(/tema--error/, { timeout: 3000 });

    bloqueando = false;
    await boton.click();
    await expect(filaDe(page, "Oficios")).not.toHaveClass(/tema--error/, { timeout: 3000 });
    await expect(boton).toHaveAttribute("aria-pressed", "true", { timeout: 3000 });
  });

  test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("cada tema tiene un <audio controls> de respaldo", async ({ page }) => {
      await page.goto("/");
      await expect(repertorio(page).getByRole("heading", { name: "Repertorio" })).toBeVisible();
      const audios = repertorio(page).locator("noscript audio");
      await expect(audios).toHaveCount(3);
    });
  });
});
