import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "cn";

import { RecordActions } from "@/components/modules/record-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { somaDe, valorDe, type Coluna } from "@/lib/columns";
import { formatarBooleano, formatarData, formatarDataHora, formatarLista, formatarMoeda, formatarNumero, formatarTexto } from "@/lib/format";
import { traduzirCodigo } from "@/lib/status";
import { urlCom, type Consulta } from "@/lib/query";

interface DataTableProps {
  rota: string;
  singular: string;
  colunas: Coluna[];
  linhas: Array<Record<string, unknown>>;
  consulta: Consulta;
  total: number;
  pagina: number;
  tamanho: number;
  comAcoes?: boolean;
  /** Algumas telas vêm de endpoints sem busca; nelas a barra some em vez de enganar. */
  permiteBusca?: boolean;
}

function conteudo(coluna: Coluna, linha: Record<string, unknown>) {
  if (coluna.tipo === "soma") return formatarNumero(somaDe(linha, coluna.campo, coluna.subcampo ?? "quantity"));
  const valor = valorDe(linha, coluna.campo);
  switch (coluna.tipo) {
    case "status": return <StatusBadge valor={valor} />;
    case "codigo": return traduzirCodigo(valor);
    case "data": return formatarData(valor);
    case "datahora": return formatarDataHora(valor);
    case "moeda": return formatarMoeda(valor);
    case "numero": return formatarNumero(valor);
    case "booleano": return formatarBooleano(valor);
    case "lista": return formatarLista(valor);
    case "destaque": return <span className="font-semibold text-foreground">{formatarTexto(valor)}</span>;
    default: return formatarTexto(valor);
  }
}

export function DataTable({ rota, singular, colunas, linhas, consulta, total, pagina, tamanho, comAcoes = false, permiteBusca = true }: DataTableProps) {
  const primeiro = total === 0 ? 0 : (pagina - 1) * tamanho + 1;
  const ultimo = Math.min(pagina * tamanho, total);
  const totalPaginas = Math.max(Math.ceil(total / tamanho), 1);
  const buscaAtual = consulta.busca ?? "";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
      {permiteBusca ? (
      <form method="get" className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        {Object.entries(consulta).map(([chave, valor]) =>
          chave === "busca" || chave === "pagina" ? null : <input key={chave} type="hidden" name={chave} value={valor ?? ""} />
        )}
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 focus-within:border-primary md:max-w-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            name="busca"
            defaultValue={buscaAtual}
            placeholder={`Pesquisar ${singular}…`}
            aria-label={`Pesquisar ${singular}`}
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
          Pesquisar
        </button>
        {buscaAtual ? (
          <Link href={urlCom(rota, consulta, { busca: undefined, pagina: undefined })} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold no-underline text-foreground transition-colors hover:bg-muted">
            Limpar
          </Link>
        ) : null}
      </form>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="bg-surface-muted">
              {colunas.map((coluna) => {
                const ativa = coluna.ordenavel && consulta.ordenar === coluna.ordenavel;
                const proximaDirecao = ativa && consulta.direcao === "asc" ? "desc" : "asc";
                const Icone = !ativa ? ChevronsUpDown : consulta.direcao === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={coluna.titulo}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-left text-[0.64rem] font-bold uppercase tracking-wide text-muted-foreground",
                      coluna.secundaria && "hidden lg:table-cell"
                    )}
                  >
                    {coluna.ordenavel ? (
                      <Link
                        href={urlCom(rota, consulta, { ordenar: coluna.ordenavel, direcao: proximaDirecao, pagina: undefined })}
                        className={cn("inline-flex items-center gap-1 no-underline hover:text-foreground", ativa ? "text-primary" : "text-muted-foreground")}
                      >
                        {coluna.titulo}
                        <Icone className="size-3" aria-hidden="true" />
                      </Link>
                    ) : (
                      coluna.titulo
                    )}
                  </th>
                );
              })}
              {comAcoes ? <th scope="col" className="px-4 py-3 text-left text-[0.64rem] font-bold uppercase tracking-wide text-muted-foreground">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={colunas.length + (comAcoes ? 1 : 0)} className="px-4 py-16 text-center">
                  <strong className="block text-sm">Nenhum {singular} encontrado</strong>
                  <small className="mt-1 block text-xs text-muted-foreground">
                    {buscaAtual ? "Tente outro termo ou limpe a busca." : "Os registros desta empresa aparecerão aqui."}
                  </small>
                </td>
              </tr>
            ) : (
              linhas.map((linha, indice) => (
                <tr key={typeof linha.id === "string" ? linha.id : indice} className="border-t border-border transition-colors hover:bg-muted/60">
                  {colunas.map((coluna) => (
                    <td key={coluna.titulo} className={cn("px-4 py-3 text-sm align-middle", coluna.secundaria && "hidden lg:table-cell")}>
                      {conteudo(coluna, linha)}
                    </td>
                  ))}
                  {comAcoes ? <td className="px-4 py-3"><RecordActions path={rota} record={linha} /></td> : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>{total === 0 ? "Nenhum registro" : `${primeiro}–${ultimo} de ${total}`}</span>
        <div className="flex items-center gap-2">
          <span>Página {pagina} de {totalPaginas}</span>
          <Link
            href={urlCom(rota, consulta, { pagina: String(Math.max(pagina - 1, 1)) })}
            aria-disabled={pagina <= 1}
            className={cn("rounded-md border border-border px-2.5 py-1.5 font-semibold no-underline text-foreground", pagina <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted")}
          >
            Anterior
          </Link>
          <Link
            href={urlCom(rota, consulta, { pagina: String(Math.min(pagina + 1, totalPaginas)) })}
            aria-disabled={pagina >= totalPaginas}
            className={cn("rounded-md border border-border px-2.5 py-1.5 font-semibold no-underline text-foreground", pagina >= totalPaginas ? "pointer-events-none opacity-40" : "hover:bg-muted")}
          >
            Próxima
          </Link>
        </div>
      </footer>
    </section>
  );
}
