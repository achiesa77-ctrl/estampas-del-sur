import { describe, expect, it } from "vitest";
import { formatoTiempo } from "../../src/scripts/formato";

describe("formatoTiempo", () => {
  it("218 segundos → 3:38", () => {
    expect(formatoTiempo(218)).toBe("3:38");
  });

  it("247.4 segundos → 4:07 (trunca, no redondea)", () => {
    expect(formatoTiempo(247.4)).toBe("4:07");
  });

  it("0 segundos → --:--", () => {
    expect(formatoTiempo(0)).toBe("--:--");
  });

  it("negativos → --:--", () => {
    expect(formatoTiempo(-5)).toBe("--:--");
  });

  it("NaN → --:--", () => {
    expect(formatoTiempo(NaN)).toBe("--:--");
  });

  it("Infinity → --:--", () => {
    expect(formatoTiempo(Infinity)).toBe("--:--");
  });
});
