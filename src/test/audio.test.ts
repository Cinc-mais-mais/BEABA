import { describe, expect, it } from "vitest";
import { audioTextSlug } from "@/lib/audio";

describe("central audio filename mapping", () => {
  it("normalizes accents, punctuation, and spaces", () => {
    expect(audioTextSlug("Texto ampliado ativado.")).toBe("texto-ampliado-ativado");
  });

  it("removes leading and trailing separators", () => {
    expect(audioTextSlug("  Olá! Beabá?  ")).toBe("ola-beaba");
  });
});
