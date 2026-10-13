import { describe, expect, it, vi } from "vitest";
import { PlatformHealthService } from "../src/services/platform-health-service";

describe("PlatformHealthService", () => {
  it("executa probes independentes e mede latência", async () => {
    const service = new PlatformHealthService({
      probes: {
        Banco: vi.fn(async () => undefined),
        Redis: vi.fn(async () => undefined),
        Storage: vi.fn(async () => undefined),
        Worker: vi.fn(async () => "healthy" as const)
      }
    });

    const result = await service.check();

    expect(result).toHaveLength(4);
    expect(result.map((line) => line.servico)).toEqual(["Banco", "Redis", "Storage", "Worker"]);
    expect(result.every((line) => line.estado === "healthy")).toBe(true);
    expect(result.every((line) => typeof line.latencia_ms === "number" && line.latencia_ms >= 0)).toBe(true);
  });

  it("isola falha de dependência e preserva estado degradado do worker", async () => {
    const redisProbe = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    const service = new PlatformHealthService({
      probes: {
        Banco: vi.fn(async () => undefined),
        Redis: redisProbe,
        Storage: vi.fn(async () => undefined),
        Worker: vi.fn(async () => "degraded" as const)
      }
    });

    const result = await service.check();

    expect(result.find((line) => line.servico === "Redis")).toMatchObject({ estado: "failed", detalhe: "ECONNREFUSED" });
    expect(result.find((line) => line.servico === "Worker")).toMatchObject({ estado: "degraded" });
    expect(result.filter((line) => line.estado === "healthy")).toHaveLength(2);
  });
});
