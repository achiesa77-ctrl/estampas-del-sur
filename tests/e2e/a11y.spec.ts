import { expect, test, type Page } from "@playwright/test";

// Verificación final (Tarea 16): chequeos transversales de accesibilidad y
// robustez sobre la página entera, no por sección.

async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

/** Recorre la página de punta a punta en pasos de media pantalla, para que
 *  cada ScrollTrigger / IntersectionObserver / carga diferida se dispare. */
async function recorrer(page: Page) {
  const alto = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= alto; y += 450) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(40);
  }
}

test.describe("escritorio", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.skip(({ isMobile }) => isMobile, "recorrido de teclado de escritorio");

  test("todo lo que recibe foco con Tab tiene un contorno visible", async ({ page }) => {
    await irAFin(page);
    const vistos = new Set<string>();
    const sinContorno: string[] = [];

    for (let i = 0; i < 200; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate((n) => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        // Identidad por nodo (no por texto: los IG/FB de los cinco
        // músicos son idénticos entre sí).
        el.dataset.tabId ??= String(n);
        const estilo = getComputedStyle(el);
        const ruta = `${el.tagName.toLowerCase()}.${el.className}|${
          el.getAttribute("href") ?? el.textContent?.trim().slice(0, 30)
        }`;
        return {
          id: el.dataset.tabId,
          ruta,
          contorno: estilo.outlineStyle,
          ancho: parseFloat(estilo.outlineWidth),
        };
      }, i);
      if (!info) continue;
      if (vistos.has(info.id)) break; // dio la vuelta
      vistos.add(info.id);
      if (info.contorno === "none" || info.ancho === 0) sinContorno.push(info.ruta);
    }

    expect(vistos.size).toBeGreaterThan(30);
    expect(sinContorno).toEqual([]);
  });

  test("cero console.error al cargar y recorrer toda la página", async ({ page }) => {
    const errores: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errores.push(m.text());
    });
    page.on("pageerror", (e) => errores.push(String(e)));
    // Sin red externa (YouTube): sólo importa lo propio.
    await page.route(/youtube|ytimg/, (r) => r.abort());
    await irAFin(page);
    await recorrer(page);
    const propios = errores.filter((e) => !/youtube|ytimg|ERR_FAILED/i.test(e));
    expect(propios).toEqual([]);
  });
});

test.describe("toda la página", () => {
  test("todas las <img> tienen atributo alt", async ({ page }) => {
    await irAFin(page);
    const sinAlt = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .filter((img) => !img.hasAttribute("alt"))
        .map((img) => img.currentSrc || img.src || img.className),
    );
    expect(sinAlt).toEqual([]);
  });
});

test.describe("móvil 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sin scroll horizontal en ningún punto del recorrido", async ({ page }) => {
    await irAFin(page);
    await recorrer(page);
    const desborde = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      ancho: window.innerWidth,
    }));
    expect(desborde.scrollWidth).toBeLessThanOrEqual(desborde.ancho);
  });

  test("botones y enlaces visibles miden al menos 44×44", async ({ page }) => {
    await irAFin(page);
    await recorrer(page);
    const chicos = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("a[href], button"))
        .filter((el) => {
          const estilo = getComputedStyle(el);
          if (estilo.visibility === "hidden" || estilo.display === "none") return false;
          if (el.closest("[inert], dialog:not([open])")) return false;
          const caja = el.getBoundingClientRect();
          if (caja.width === 0 && caja.height === 0) return false;
          // El salto «Ir al contenido» sólo aparece con foco de teclado.
          if (el.classList.contains("salto")) return false;
          return caja.width < 44 - 0.5 || caja.height < 44 - 0.5;
        })
        .map((el) => {
          const c = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()}.${el.className} «${el.textContent?.trim().slice(0, 30)}» ${Math.round(c.width)}×${Math.round(c.height)}`;
        }),
    );
    expect(chicos).toEqual([]);
  });
});
