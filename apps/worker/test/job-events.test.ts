import { describe, expect, it, vi } from "vitest";
import { attachJobEvents } from "../src/services/job-events";
import type { JobRegistry } from "../src/services/job-registry";

describe("attachJobEvents", () => {
  it("conecta active, completed e failed ao registry", async () => {
    const handlers = new Map<string, (...args: never[]) => void | Promise<void>>();
    const worker = { on: vi.fn((event: string, handler: (...args: never[]) => void | Promise<void>) => { handlers.set(event, handler); }) };
    const start = vi.fn(async () => "record-1");
    const complete = vi.fn(async () => undefined);
    const fail = vi.fn(async () => undefined);
    const recordTenantScan = vi.fn(async () => undefined);
    const registry: JobRegistry = {
      start,
      complete,
      fail,
      recordTenantScan
    };
    const job = { id: "42", name: "validate-foundation", data: { tenantId: "10000000-0000-0000-0000-000000000001" }, attemptsMade: 0, opts: { attempts: 3 } };

    attachJobEvents(worker as never, "foundation-validation", registry);
    await handlers.get("active")?.(job as never);
    await handlers.get("completed")?.(job as never, { accepted: true } as never);
    await handlers.get("failed")?.(job as never, new Error("falhou") as never);

    expect(start).toHaveBeenCalledWith(expect.objectContaining({ queue: "foundation-validation", externalJobId: "42", type: "validate-foundation", tenantId: "10000000-0000-0000-0000-000000000001" }));
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ queue: "foundation-validation", externalJobId: "42", result: { accepted: true } }));
    expect(fail).toHaveBeenCalledWith(expect.objectContaining({ queue: "foundation-validation", externalJobId: "42", error: expect.any(Error) as unknown }));
  });
});
