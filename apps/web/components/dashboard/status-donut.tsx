"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface StatusFatia {
  nome: string;
  valor: number;
  cor: string;
}

/** Distribuição dos ativos por situação. Recebe os dados já agregados pela API. */
export function StatusDonut({ fatias, total }: { fatias: StatusFatia[]; total: number }) {
  const comValor = fatias.filter((fatia) => fatia.valor > 0);

  if (total === 0 || comValor.length === 0) {
    return (
      <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center">
        <p className="m-0 max-w-xs text-sm text-muted-foreground">
          Cadastre ativos para ver aqui a distribuição por situação.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-56 w-full max-w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={comValor} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="100%" paddingAngle={2} strokeWidth={0}>
              {comValor.map((fatia) => <Cell key={fatia.nome} fill={fatia.cor} />)}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)", fontSize: 12 }}
              formatter={(valor, nome) => [`${typeof valor === "number" ? valor : 0} ativo(s)`, String(nome ?? "")]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl font-bold leading-none">{total}</span>
          <small className="text-[0.68rem] text-muted-foreground">ativos</small>
        </div>
      </div>
      <ul className="m-0 grid flex-1 list-none gap-2 p-0">
        {comValor.map((fatia) => (
          <li key={fatia.nome} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: fatia.cor }} aria-hidden="true" />
            <span className="flex-1 text-muted-foreground">{fatia.nome}</span>
            <strong>{fatia.valor}</strong>
            <span className="w-12 text-right text-xs text-muted-foreground">{Math.round((fatia.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
