import { describe, expect, it } from "vitest";

import { ordemDeConsulta } from "../src/services/tenant-resource-service";

describe("ordenação de recursos", () => {
  it("mantém nulos no fim ao ordenar valores em qualquer direção", () => {
    expect(ordemDeConsulta("purchase_value", "asc", "created_at.desc")).toBe("purchase_value.asc.nullslast");
    expect(ordemDeConsulta("purchase_value", "desc", "created_at.desc")).toBe("purchase_value.desc.nullslast");
  });
});
