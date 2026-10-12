import { expect, test, type Page } from "@playwright/test";

// Videos (spec §3 fila 7, oscuro): facade de miniatura de YouTube → iframe
// de youtube-nocookie al clic. Sin JS cada tarjeta es un enlace directo a
// youtube.com/watch; initVideos() (src/scripts/videos.ts) la reemplaza por
// un <button> real y abre el embed sin cargarlo de entrada (más liviano,
// sin cookies de YouTube hasta que el usuario decide reproducir). Puerto de
// `git show main:script.js:429-488`: un solo video a la vez, abrir otro
// cierra (y restaura la miniatura de) el anterior.
const videos = (page: Page) => page.locator("#videos");
const botones = (page: Page) => videos(page).getByRole("button", { name: /^Reproducir video:/ });
// Selector estable por posición en el DOM: a diferencia de getByRole, no
// deja de encontrar una tarjeta cuando queda `hidden` (fuera del árbol de
// accesibilidad) mientras su video suena — necesario para indexar "la
// segunda", "la primera", etc. después de abrir/cerrar un facade.
const tarjetas = (page: Page) => videos(page).locator(".video");

/** La portada corre un timeline de ~4.5s con pin propio: los tests que
 * scrollean esperan su estado final primero (global.md). */
async function irAFin(page: Page) {
  await page.goto("/?t=fin");
  await expect(page.locator('.portada[data-estado="final"]')).toBeAttached();
}

// JPEG 1×1 mínima: evita pegarle a i.ytimg.com de verdad en los tests.
const MINI_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AKkAD//Z",
  "base64",
);

test.beforeEach(async ({ page }) => {
  // Miniaturas: se fulfillea con una JPEG local en vez de pegarle a la red
  // real; el resto de pedidos a YouTube (embed, watch de respaldo) se
  // abortan — ningún test debe tocar Internet.
  await page.route("**/i.ytimg.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: MINI_JPEG }),
  );
  await page.route("**/*youtube*/**", (route) => route.abort());
});

test.describe("Videos", () => {
  test("título y tres botones «Reproducir video:», el primero destacado", async ({ page }) => {
    await irAFin(page);
    await videos(page).scrollIntoViewIfNeeded();
    await expect(videos(page).getByRole("heading", { name: "Videos" })).toBeVisible();
    await expect(botones(page)).toHaveCount(3);
    await expect(botones(page).first()).toHaveAccessibleName("Reproducir video: Soy Uruguayo");
    await expect(videos(page).locator(".videos__item--feat")).toHaveCount(1);
    await expect(videos(page).locator(".videos__item--feat .video")).toHaveAttribute(
      "aria-label",
      "Reproducir video: Soy Uruguayo",
    );
  });

  test("clic en el primero abre un iframe de youtube-nocookie con su id y le pasa el foco", async ({
    page,
  }) => {
    await irAFin(page);
    await videos(page).scrollIntoViewIfNeeded();

    await tarjetas(page).nth(0).click();

    const iframe = videos(page).locator("iframe.video__frame");
    await expect(iframe).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/FTPrXeWkYpg/);
    await expect(iframe).toHaveAttribute("src", /autoplay=1/);
    await expect(iframe).toHaveAttribute("title", "Soy Uruguayo");
    await expect(iframe).toHaveAttribute("allowfullscreen", "");
    await expect(iframe).toBeFocused();
    // El botón clickeado queda oculto (no destruido) mientras su video suena.
    await expect(tarjetas(page).nth(0)).toBeHidden();
  });

  test("clic en el segundo cierra el primero: un solo iframe y la miniatura vuelve a funcionar", async ({
    page,
  }) => {
    await irAFin(page);
    await videos(page).scrollIntoViewIfNeeded();

    await tarjetas(page).nth(0).click();
    await expect(videos(page).locator("iframe.video__frame")).toHaveCount(1);

    await tarjetas(page).nth(1).click();

    await expect(videos(page).locator("iframe.video__frame")).toHaveCount(1);
    await expect(videos(page).locator("iframe.video__frame")).toHaveAttribute(
      "src",
      /embed\/-ab0KSnYS4E/,
    );
    // La miniatura del primero vuelve a estar visible y operable (no quedó
    // destruida: es el mismo nodo, no uno nuevo).
    await expect(tarjetas(page).nth(0)).toBeVisible();
    await tarjetas(page).nth(0).click();
    await expect(videos(page).locator("iframe.video__frame")).toHaveAttribute(
      "src",
      /embed\/FTPrXeWkYpg/,
    );
  });

  test("la sección queda marcada data-js tras inicializar", async ({ page }) => {
    await irAFin(page);
    await videos(page).scrollIntoViewIfNeeded();
    await expect(videos(page)).toHaveAttribute("data-js", "");
  });

  test.describe("escritorio (con movimiento, puntero fino)", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test.skip(({ isMobile }) => isMobile, "el hover de puntero fino no aplica en emulación táctil");

    test("al pasar el mouse, la miniatura se agranda levemente", async ({ page }) => {
      await irAFin(page);
      await videos(page).scrollIntoViewIfNeeded();

      const img = botones(page).first().locator(".video__img");
      const antes = await img.evaluate((el) => getComputedStyle(el).transform);
      await botones(page).first().hover();
      await expect
        .poll(() => img.evaluate((el) => getComputedStyle(el).transform))
        .not.toBe(antes);
    });
  });

  test.describe("con movimiento reducido", () => {
    test.use({ reducedMotion: "reduce" });

    test("no hay transición de agrandado al pasar el mouse (escritorio)", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "requiere puntero fino de escritorio");
      await irAFin(page);
      await videos(page).scrollIntoViewIfNeeded();
      const img = botones(page).first().locator(".video__img");
      await botones(page).first().hover();
      await expect(img).toHaveCSS("transform", "none");
    });
  });

  test.describe("sin JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("cada tarjeta es un enlace directo a youtube.com/watch con su id", async ({ page }) => {
      await page.goto("/");
      await expect(videos(page).getByRole("heading", { name: "Videos" })).toBeVisible();
      const enlaces = videos(page).locator("a.video");
      await expect(enlaces).toHaveCount(3);
      await expect(enlaces.first()).toHaveAttribute(
        "href",
        "https://www.youtube.com/watch?v=FTPrXeWkYpg",
      );
      await expect(enlaces.first()).toHaveAttribute("aria-label", "Reproducir video: Soy Uruguayo");
    });
  });
});
