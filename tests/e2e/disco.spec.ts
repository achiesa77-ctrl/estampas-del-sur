import { expect, test, type Locator, type Page } from "@playwright/test";

// Disco (spec §3 fila 6, papel): «Soy Uruguayo» 2026, con un mapa de
// Uruguay que se dibuja en trazo dorado (pirograbado, MapaUruguay.astro +
// src/scripts/revelado.ts modo "trazo").
const disco = (page: Page) => page.locator("#disco");
const trazo = (page: Page) => disco(page).locator('[data-revelar="trazo"]');
const punto = (page: Page) => disco(page).locator("[data-punto]");

/** La portada corre un timeline de ~4.5s con pin propio: los tests que
 * scrollean esperan su estado final primero (global.md). */
async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

async function opacidad(el: Locator): Promise<number> {
  return el.evaluate((n) => parseFloat(getComputedStyle(n).opacity));
}

test.describe("Disco", () => {
  test("título, datos y fecha de lanzamiento", async ({ page }) => {
    await irAFin(page);
    await disco(page).scrollIntoViewIfNeeded();
    await expect(disco(page).getByRole("heading", { name: "«Soy Uruguayo»" })).toBeVisible();
    await expect(disco(page).getByText("Segundo disco · 2026")).toBeVisible();
    await expect(disco(page).getByText(/24 de julio/)).toBeVisible();
    await expect(disco(page).getByText(/pendrive/)).toBeVisible();
  });

  test("el enlace de WhatsApp lleva el texto prellenado y el de Instagram, el perfil real", async ({
    page,
  }) => {
    await irAFin(page);
    await disco(page).scrollIntoViewIfNeeded();

    const wsp = disco(page).getByRole("link", { name: /pedir el disco por whatsapp/i });
    await expect(wsp).toHaveAttribute("href", /wa\.me\/59895871148\?text=/);
    const href = await wsp.getAttribute("href");
    expect(decodeURIComponent(href!.split("text=")[1])).toBe("Hola, quiero el disco Soy Uruguayo");
    await expect(wsp).toHaveAttribute("target", "_blank");
    await expect(wsp).toHaveAttribute("rel", "noopener");

    const ig = disco(page).getByRole("link", { name: /escribir por instagram/i });
    await expect(ig).toHaveAttribute("href", /instagram\.com\/estampasdelsur/);
    await expect(ig).toHaveAttribute("target", "_blank");
  });

  test("la frase de cierre acompaña la foto del disco", async ({ page }) => {
    await irAFin(page);
    await disco(page).scrollIntoViewIfNeeded();
    await expect(
      disco(page).getByText("Es una producción independiente, hecha con mucho esfuerzo"),
    ).toBeVisible();
    await expect(disco(page).locator("figure.copia img")).toBeVisible();
  });

  test("el path del mapa trae pathLength=1 y el punto de Pando", async ({ page }) => {
    await irAFin(page);
    await disco(page).scrollIntoViewIfNeeded();
    await expect(trazo(page)).toHaveAttribute("pathLength", "1");
    await expect(punto(page)).toHaveCount(1);
  });

  test("el mapa se dibuja progresivamente al entrar en pantalla", async ({ page }) => {
    await irAFin(page);
    // Se scrollea el propio mapa (no sólo la sección): en móvil, al ir al
    // pie de la columna visual (foto + mapa como contrapeso, ronda 1 de
    // revisión), el mapa queda más abajo que lo que un scrollIntoView del
    // <section> entero alcanza a traer a la vista.
    await trazo(page).scrollIntoViewIfNeeded();
    await expect
      .poll(() => trazo(page).evaluate((p) => parseFloat(getComputedStyle(p).strokeDashoffset)))
      .toBeLessThan(1);
  });

  test.describe("con movimiento reducido", () => {
    test.use({ reducedMotion: "reduce" });

    test("el mapa queda dibujado por completo, sin animación", async ({ page }) => {
      await irAFin(page);
      await disco(page).scrollIntoViewIfNeeded();
      // Poll, no un wait fijo: el revelado "trazo" hace como mucho un
      // fundido de opacidad del punto (≤300ms); un wait corto puede caer a
      // mitad (hallazgo de la ronda 1 de revisión de esta tarea).
      await expect
        .poll(() => trazo(page).evaluate((p) => parseFloat(getComputedStyle(p).strokeDashoffset)))
        .toBe(0);
      await expect(punto(page)).toBeVisible();
    });

    // Ronda 1 de revisión: con reduce, a 1440px, el título/cuerpo/foto de
    // Disco llegaban a parpadear invisibles un instante (revelarSimple y
    // revelarCopias aplicaban su estado "from" de golpe incluso cuando el
    // contenido ya estaba a la vista o el salto de scroll ya había
    // ocurrido). Arreglado en revelado.ts (función yaEntro + gsap.set en
    // vez de fromTo); estos tests fijan el contrato: visible y con opacidad
    // asentada en ~1 apenas entra en pantalla, sea cual sea el camino.
    test.describe("a 1440px", () => {
      test.use({ viewport: { width: 1440, height: 900 } });

      async function elementosClave(page: Page) {
        return {
          titulo: disco(page).getByRole("heading", { name: "«Soy Uruguayo»" }),
          cuerpo: disco(page).locator(".disco__cuerpo"),
          foto: disco(page).locator("figure.copia img"),
          whatsapp: disco(page).getByRole("link", { name: /pedir el disco por whatsapp/i }),
        };
      }

      test("título, cuerpo, foto y CTA de WhatsApp quedan visibles al scrollear a la sección", async ({
        page,
      }) => {
        await irAFin(page);
        await disco(page).scrollIntoViewIfNeeded();

        const { titulo, cuerpo, foto, whatsapp } = await elementosClave(page);
        for (const el of [titulo, cuerpo, foto, whatsapp]) {
          await expect(el).toBeVisible();
          await expect.poll(() => opacidad(el)).toBeGreaterThanOrEqual(0.99);
        }
      });

      test("cargando /#disco directamente, el contenido ya está visible", async ({ page }) => {
        await page.goto("/#disco");

        const { titulo, cuerpo, foto, whatsapp } = await elementosClave(page);
        for (const el of [titulo, cuerpo, foto, whatsapp]) {
          await expect(el).toBeVisible();
          await expect.poll(() => opacidad(el)).toBeGreaterThanOrEqual(0.99);
        }
      });
    });
  });

  test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("todo el contenido y el mapa dibujado están visibles de entrada", async ({ page }) => {
      await page.goto("/");
      await expect(disco(page).getByRole("heading", { name: "«Soy Uruguayo»" })).toBeVisible();
      const offset = await trazo(page).evaluate((p) => parseFloat(getComputedStyle(p).strokeDashoffset));
      expect(offset).toBe(0);
      await expect(
        disco(page).getByRole("link", { name: /pedir el disco por whatsapp/i }),
      ).toBeVisible();
    });
  });
});
