import { describe, expect, it } from "vitest";
import { processFoundationJob } from "../src/processors/foundation";

describe("foundation worker", () => {
  it("validates and handles a tenant-scoped job", async () => {
    const result = await processFoundationJob({
      data: {
        tenantId: "10000000-0000-4000-8000-000000000001",
        requestedBy: "20000000-0000-4000-8000-000000000001",
        message: "ping"
      }
    });
    expect(result).toMatchObject({
      tenantId: "10000000-0000-4000-8000-000000000001",
      accepted: true
    });
  });

  it("rejects unscoped or malformed jobs", async () => {
    await expect(processFoundationJob({ data: { message: "ping" } as never })).rejects.toThrow();
  });
});
