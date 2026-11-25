import { describe, expect, it } from "vitest";
import { decodePcm16 } from "@/lib/google-live-speech";

describe("Google Live audio decoding", () => {
  it("converts little-endian PCM16 samples to normalized floats", () => {
    const encoded = btoa(String.fromCharCode(0, 128, 255, 127));

    expect(Array.from(decodePcm16(encoded))).toEqual([-1, 32767 / 32768]);
  });

  it("ignores an incomplete final PCM16 sample", () => {
    const encoded = btoa(String.fromCharCode(0, 0, 255));

    expect(Array.from(decodePcm16(encoded))).toEqual([0]);
  });
});
