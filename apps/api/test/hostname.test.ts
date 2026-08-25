import { describe, expect, it } from "vitest";
import { normalizeHostname } from "../src/services/hostname";

describe("normalizeHostname", () => {
  it("normalizes casing, port and trailing dot", () => {
    expect(normalizeHostname("Tenant-A.Localhost.:3333")).toBe("tenant-a.localhost");
  });

  it("rejects host header injection-like values", () => {
    expect(() => normalizeHostname("tenant-a.localhost/path")).toThrow("Hostname inválido");
    expect(() => normalizeHostname("user@tenant-a.localhost")).toThrow("Hostname inválido");
  });
});
