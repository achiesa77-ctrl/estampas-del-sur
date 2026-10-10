// Verifica contraste WCAG AA (≥ 4.5:1) leyendo los hex reales de
// src/styles/tokens.css (import `?raw` de Vite/Vitest), para que el test
// guarde el archivo real y no una copia de los valores (spec §2.2 / brief
// Tarea 4).
import { describe, expect, it } from "vitest";
import css from "../../src/styles/tokens.css?raw";

function extraerHex(token: string): string {
  const patron = new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6})`);
  const coincidencia = css.match(patron);
  if (!coincidencia) {
    throw new Error(`No se encontró --${token} en tokens.css`);
  }
  return coincidencia[1];
}

function linealizar(canal: number): number {
  const s = canal / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linealizar(r) + 0.7152 * linealizar(g) + 0.0722 * linealizar(b);
}

function contraste(a: string, b: string): number {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  const claro = Math.max(l1, l2);
  const oscuro = Math.min(l1, l2);
  return (claro + 0.05) / (oscuro + 0.05);
}

const tokens = {
  oscuro: extraerHex("oscuro"),
  papel: extraerHex("papel"),
  tinta: extraerHex("tinta"),
  plata: extraerHex("plata"),
  lapiz: extraerHex("lapiz"),
  oro: extraerHex("oro"),
  "oro-viejo": extraerHex("oro-viejo"),
};

describe("contraste WCAG AA de los tokens de color", () => {
  it.each([
    ["papel", "oscuro"], // texto principal sobre escenas de foto
    ["tinta", "papel"], // texto principal sobre lectura
    ["plata", "oscuro"], // datos/epígrafes sobre oscuro
    ["lapiz", "papel"], // datos/epígrafes sobre papel
    ["oro", "oscuro"], // único acento, sobre oscuro
    ["oro-viejo", "papel"], // el mismo acento, sobre papel
    ["oscuro", "oro"], // texto del CTA sobre el acento
  ] as const)("%s sobre %s es ≥ 4.5:1", (texto, fondo) => {
    const ratio = contraste(tokens[texto], tokens[fondo]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
