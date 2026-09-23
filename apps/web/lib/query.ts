export type Consulta = Record<string, string | undefined>;

/** Monta a URL da tela preservando a consulta atual e aplicando só o que mudou. */
export function urlCom(rota: string, atuais: Consulta, mudancas: Consulta): string {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atuais, ...mudancas })) {
    if (valor !== undefined && valor !== "") params.set(chave, valor);
  }
  const query = params.toString();
  return query ? `/${rota}?${query}` : `/${rota}`;
}

/** Normaliza os searchParams do Next, que podem vir como lista. */
export function consultaDeSearchParams(entrada: Record<string, string | string[] | undefined> | undefined): Consulta {
  const consulta: Consulta = {};
  for (const [chave, valor] of Object.entries(entrada ?? {})) {
    const texto = Array.isArray(valor) ? valor[0] : valor;
    if (typeof texto === "string" && texto.trim() !== "") consulta[chave] = texto.trim();
  }
  return consulta;
}
