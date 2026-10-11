import { expect, test, type Page } from "@playwright/test";

// Historia y Agenda (spec §3 filas 4 y 9, papel). Historia: narrativa con
// capitular + copias impresas que caen y hacen foco (data-revelar="copia").
// Agenda: section--compacta; estado vacío con CTA de contacto mientras
// fechas.ts esté vacío (spec §9: fuera de alcance tener fechas reales).
const historia = (page: Page) => page.locator("#historia");
const agenda = (page: Page) => page.locator("#agenda");
const copias = (page: Page) => historia(page).locator("figure.copia");

/** La portada corre un timeline de ~4.5s con pin propio: los tests que
 * scrollean esperan su estado final primero (global.md). */
async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

test.describe("Historia", () => {
  test("título, primer párrafo y al menos 2 copias con epígrafe no vacío", async ({ page }) => {
    await irAFin(page);
    await historia(page).scrollIntoViewIfNeeded();
    await expect(historia(page).getByRole("heading", { name: "Historia" })).toBeVisible();
    await expect(historia(page).locator(".historia__cuerpo p").first()).toContainText("Nacimos en 2011");

    const total = await copias(page).count();
    expect(total).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < total; i++) {
      const texto = await copias(page).nth(i).locator("figcaption").innerText();
      expect(texto.trim().length).toBeGreaterThan(0);
    }
  });

  test("cada copia tiene una rotación fija distinta (variedad de ritmo, craft R4)", async ({ page }) => {
    await irAFin(page);
    await historia(page).scrollIntoViewIfNeeded();
    const rotaciones = await copias(page).evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).transform),
    );
    expect(new Set(rotaciones).size).toBe(rotaciones.length);
  });

  test.describe("con movimiento reducido", () => {
    test.use({ reducedMotion: "reduce" });

    test("las copias quedan visibles sin filtro (nunca filter: blur)", async ({ page }) => {
      await irAFin(page);
      await historia(page).scrollIntoViewIfNeeded();
      await expect(copias(page).first()).toBeVisible();
      const filtro = await copias(page).first().evaluate((el) => getComputedStyle(el).filter);
      expect(filtro).toBe("none");
    });

    // Ronda 1 de revisión de Tarea 11 (Disco): revelarCopias aplicaba su
    // estado "from" de golpe en onEnter incluso cuando la copia ya estaba
    // a la vista o el salto de scroll ya había ocurrido, haciéndola
    // parpadear invisible un instante antes de asentarse — mismo mecanismo
    // que revelarSimple, afecta a cualquier sección con data-revelar="copia".
    // Arreglado en src/scripts/revelado.ts; este test fija el contrato acá
    // también (no sólo en Disco).
    test("a 1440px, las copias quedan con opacidad asentada en ~1 al scrollear a la sección", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await irAFin(page);
      await historia(page).scrollIntoViewIfNeeded();

      const primera = copias(page).first();
      await expect(primera).toBeVisible();
      await expect
        .poll(() => primera.evaluate((el) => parseFloat(getComputedStyle(el).opacity)))
        .toBeGreaterThanOrEqual(0.99);
    });
  });

  test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("las copias y sus epígrafes están visibles de entrada (estado final)", async ({ page }) => {
      await page.goto("/");
      await expect(copias(page).first()).toBeVisible();
      await expect(copias(page).first().locator("figcaption")).not.toBeEmpty();
    });
  });
});

test.describe("Agenda", () => {
  test("estado vacío: mensaje y enlaces de contacto", async ({ page }) => {
    await irAFin(page);
    await agenda(page).scrollIntoViewIfNeeded();
    await expect(agenda(page).getByRole("heading", { name: "Próximas fechas" })).toBeVisible();
    await expect(agenda(page).getByText("No hay fechas anunciadas")).toBeVisible();

    const wsp = agenda(page).getByRole("link", { name: /whatsapp/i });
    await expect(wsp).toHaveAttribute("href", /wa\.me\/59895871148/);
    await expect(wsp).toHaveAttribute("target", "_blank");
    await expect(wsp).toHaveAttribute("rel", /noopener/);

    const ig = agenda(page).getByRole("link", { name: /instagram/i });
    await expect(ig).toHaveAttribute("href", /instagram\.com/);
    await expect(ig).toHaveAttribute("target", "_blank");
    await expect(ig).toHaveAttribute("rel", /noopener/);
  });

  test("los botones de contacto cumplen el alto mínimo táctil de 44px", async ({ page }) => {
    await irAFin(page);
    await agenda(page).scrollIntoViewIfNeeded();
    const botones = agenda(page).getByRole("link", { name: /whatsapp|instagram/i });
    const alturas = await botones.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(alturas.length).toBeGreaterThan(0);
    for (const alto of alturas) expect(alto).toBeGreaterThanOrEqual(44);
  });

  test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("el mensaje y los enlaces de contacto están visibles sin script", async ({ page }) => {
      await page.goto("/");
      await expect(agenda(page).getByText("No hay fechas anunciadas")).toBeVisible();
      await expect(agenda(page).getByRole("link", { name: /whatsapp/i })).toBeVisible();
    });
  });
});
