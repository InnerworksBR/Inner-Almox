import { describe, expect, it } from "vitest";

import { basePathForForm } from "./module-path";

describe("basePathForForm", () => {
  it("remove o id e o sufixo editar da rota do cadastro", () => {
    expect(basePathForForm(["patrimonio", "ativos", "98d5ddb1-7c9b-467d-b525-1ffc7fa5f149", "editar"], "edit"))
      .toBe("patrimonio/ativos");
  });
});
