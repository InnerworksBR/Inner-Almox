import Link from "next/link";

import { MetricCard, type MetricTint } from "@/components/dashboard/metric-card";
import { MonthlyBarChart, type MonthlySeriesPoint } from "@/components/dashboard/monthly-bar-chart";
import { StatusDonut, type StatusFatia } from "@/components/dashboard/status-donut";
import { fetchTenantRecord } from "@/lib/api/server";
import { formatarMoeda, formatarNumero } from "@/lib/format";

type ModuleDomain = "patrimonio" | "almoxarifado" | "frota";

interface ModuleDashboardData {
  module: ModuleDomain;
  metrics: Record<string, number>;
  distribution: StatusFatia[];
  monthly: MonthlySeriesPoint[];
}

const domainCopy: Record<ModuleDomain, { title: string; description: string; action: string; unidade: string; series: Array<{ key: string; label: string; color: string }> }> = {
  patrimonio: {
    title: "Patrimônio",
    description: "Visão consolidada dos bens, responsabilidades e condições.",
    action: "/patrimonio/ativos/novo",
    unidade: "ativos",
    series: [{ key: "movements", label: "Movimentações", color: "var(--primary)" }]
  },
  almoxarifado: {
    title: "Almoxarifado",
    description: "Saldos, consumo, validade e necessidades de reposição.",
    action: "/almoxarifado/produtos/novo",
    unidade: "produtos",
    series: [
      { key: "entries", label: "Entradas", color: "var(--primary)" },
      { key: "exits", label: "Saídas", color: "var(--amber)" }
    ]
  },
  frota: {
    title: "Frota",
    description: "Disponibilidade, utilização, quilometragem e custos dos veículos.",
    action: "/frota/veiculos/novo",
    unidade: "veículos",
    series: [{ key: "cost", label: "Custos", color: "var(--primary)" }]
  }
};

const tints: MetricTint[] = ["emerald", "sky", "lime", "amber", "violet"];
const distributionColors = ["var(--primary)", "var(--lime)", "#d39a2c", "#9aada4", "#7c6ce8"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numero(value: unknown): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : 0;
}

function texto(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function dashboardOf(value: Record<string, unknown> | null, domain: ModuleDomain): ModuleDashboardData {
  const metrics = isRecord(value?.metrics) ? Object.fromEntries(Object.entries(value.metrics).map(([key, metric]) => [key, numero(metric)])) : {};
  const distribution: StatusFatia[] = Array.isArray(value?.distribution)
    ? value.distribution.filter(isRecord).map((item, index) => ({ nome: texto(item.label, texto(item.key, "Status")), valor: numero(item.value), cor: distributionColors[index % distributionColors.length] ?? "var(--primary)" }))
    : [];
  const monthly = Array.isArray(value?.monthly)
    ? value.monthly.filter(isRecord).map((item) => ({
        month: texto(item.month, ""),
        label: texto(item.label, texto(item.month, "")),
        values: isRecord(item.values) ? Object.fromEntries(Object.entries(item.values).map(([key, point]) => [key, numero(point)])) : {}
      }))
    : [];

  return { module: domain, metrics, distribution, monthly };
}

function metricsFor(domain: ModuleDomain, metrics: Record<string, number>) {
  if (domain === "patrimonio") {
    return [
      { label: "Total de ativos", value: formatarNumero(metrics.total ?? 0), detail: "Ativos cadastrados" },
      { label: "Em uso", value: formatarNumero(metrics.in_use ?? 0), detail: "Com responsável ou movimentação ativa" },
      { label: "Disponíveis", value: formatarNumero(metrics.available ?? 0), detail: "Prontos para uso" },
      { label: "Em manutenção", value: formatarNumero(metrics.maintenance ?? 0), detail: "Em manutenção ou aguardando" },
      { label: "Valor de aquisição", value: formatarMoeda(metrics.value ?? 0), detail: "Bens ativos" }
    ];
  }

  if (domain === "almoxarifado") {
    return [
      { label: "Valor em estoque", value: formatarMoeda(metrics.stock_value ?? 0), detail: "Custo médio registrado" },
      { label: "Produtos ativos", value: formatarNumero(metrics.products_active ?? 0), detail: "Produtos disponíveis" },
      { label: "Abaixo do mínimo", value: formatarNumero(metrics.below_minimum ?? 0), detail: "Precisam de reposição" },
      { label: "Lotes vencendo", value: formatarNumero(metrics.batches_expiring ?? 0), detail: "Próximos 30 dias" }
    ];
  }

  return [
    { label: "Veículos", value: formatarNumero(metrics.vehicles ?? 0), detail: "Veículos cadastrados" },
    { label: "Disponíveis", value: formatarNumero(metrics.available ?? 0), detail: "Prontos para uso" },
    { label: "Em uso", value: formatarNumero(metrics.in_use ?? 0), detail: "Em utilização" },
    { label: "Documentos vencidos", value: formatarNumero(metrics.expired_documents ?? 0), detail: "Exigem atenção" },
    { label: "Custos acumulados", value: formatarMoeda(metrics.cost ?? 0), detail: "Abastecimentos, despesas e multas" }
  ];
}

function totalFor(domain: ModuleDomain, metrics: Record<string, number>): number {
  return domain === "patrimonio" ? metrics.total ?? 0 : domain === "almoxarifado" ? metrics.products_active ?? 0 : metrics.vehicles ?? 0;
}

export async function ModuleDashboard({ domain }: { domain: ModuleDomain }) {
  const copy = domainCopy[domain];
  const dados = dashboardOf(await fetchTenantRecord(`dashboard/${domain}`), domain);
  const metricas = metricsFor(domain, dados.metrics);
  const total = totalFor(domain, dados.metrics);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Dashboard</span>
          <h1 className="mb-1 mt-1.5 text-2xl font-bold tracking-tight lg:text-3xl">{copy.title}</h1>
          <p className="m-0 max-w-2xl text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-dark" href={copy.action}>Novo cadastro</Link>
      </header>

      <section aria-label={`Indicadores de ${copy.title}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metricas.map((metrica, indice) => <MetricCard key={metrica.label} {...metrica} tint={tints[indice % tints.length]} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <article className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Indicadores</span>
              <h2 className="m-0 mt-1 text-lg font-semibold">Evolução no período</h2>
            </div>
          </div>
          <MonthlyBarChart data={dados.monthly} series={copy.series} />
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-4">
            <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Distribuição</span>
            <h2 className="m-0 mt-1 text-lg font-semibold">Por status</h2>
          </div>
          <StatusDonut
            total={total}
            fatias={dados.distribution}
            unidade={copy.unidade}
            emptyMessage="Cadastre registros para ver aqui a distribuição."
          />
        </article>
      </section>
    </div>
  );
}
