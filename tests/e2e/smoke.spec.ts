import { test, expect } from "@playwright/test";

test("home page loads with the right title and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.goto("/");

  await expect(page).toHaveTitle(/Estampas del Sur/);
  expect(errors).toEqual([]);
});
