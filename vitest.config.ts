import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    // Por defecto Vitest mockea los imports de CSS (devuelven vacío).
    // contraste.test.ts necesita el contenido real de tokens.css (`?raw`)
    // para no duplicar los valores de color en el test.
    css: true,
  },
});
