import Link from "next/link";
import {
  ArrowLeftRight, ArrowUpRight, Boxes, Car, CirclePlus, ClipboardCheck, Fuel, PackagePlus,
  ShieldCheck, TriangleAlert, Wallet, Wrench
} from "lucide-react";

import { MetricCard, type MetricTint } from "@/components/dashboard/metric-card";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { fetchTenantCollection, fetchTenantRecord } from "@/lib/api/server";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataHora = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const rotuloMovimentacao: Record<string, string> = {
  delivery: "Entrega", return: "Devolução", loan: "Empréstimo", department_transfer: "Transferência de setor",
  branch_transfer: "Transferência de filial", reservation: "Reserva", maintenance_out: "Envio para manutenção",
  maintenance_return: "Retorno de manutenção", disposal: "Baixa", sale: "Venda", donation: "Doação", loss: "Extravio"
};

function numero(origem: Record<string, unknown> | null, chave: string): number {
  const valor = origem?.[chave];
  return typeof valor === "number" ? valor : 0;
}

function texto(linha: Record<string, unknown>, chave: string): string {
  const valor = linha[chave];
  return typeof valor === "string" || typeof valor === "number" ? String(valor) : "";
}

export default async function DashboardPage() {
  const [indicadores, movimentacoes, ativos] = await Promise.all([
    fetchTenantRecord("dashboard"),
    fetchTenantCollection("asset-movements"),
    fetchTenantCollection("assets")
  ]);

  const totalAtivos = numero(indicadores, "total_assets");
  const emUso = numero(indicadores, "assets_in_use");
  const disponiveis = numero(indicadores, "assets_available");
  const emManutencao = numero(indicadores, "assets_in_maintenance");
  const outros = Math.max(totalAtivos - emUso - disponiveis - emManutencao, 0);

  const cartoes: Array<{ label: string; value: string; detail: string; icon: typeof Boxes; tint: MetricTint; href: string }> = [
    { label: "Ativos", value: String(totalAtivos), detail: `${disponiveis} disponíveis`, icon: Boxes, tint: "emerald", href: "/patrimonio/ativos" },
    { label: "Patrimônio", value: moeda.format(numero(indicadores, "asset_value")), detail: "Valor de aquisição", icon: Wallet, tint: "lime", href: "/patrimonio/relatorios" },
    { label: "Em uso", value: String(emUso), detail: `${numero(indicadores, "assets_without_responsible")} sem responsável`, icon: ClipboardCheck, tint: "sky", href: "/patrimonio/movimentacoes" },
    { label: "Em manutenção", value: String(emManutencao), detail: `${numero(indicadores, "maintenance_overdue")} atrasadas`, icon: Wrench, tint: "amber", href: "/patrimonio/manutencoes" },
    { label: "Estoque crítico", value: String(numero(indicadores, "stock_below_minimum")), detail: "Abaixo do mínimo", icon: PackagePlus, tint: "rose", href: "/almoxarifado/produtos" },
    { label: "Veículos em uso", value: String(numero(indicadores, "vehicles_in_use")), detail: `${numero(indicadores, "vehicles_available")} disponíveis`, icon: Car, tint: "violet", href: "/frota/veiculos" }
  ];

  const pendencias = [
    { label: "Garantias vencendo em 30 dias", valor: numero(indicadores, "warranties_expiring"), href: "/patrimonio/garantias", icon: ShieldCheck },
    { label: "Manutenções atrasadas", valor: numero(indicadores, "maintenance_overdue"), href: "/patrimonio/manutencoes", icon: Wrench },
    { label: "Produtos abaixo do mínimo", valor: numero(indicadores, "stock_below_minimum"), href: "/almoxarifado/produtos", icon: PackagePlus },
    { label: "Lotes vencendo em 30 dias", valor: numero(indicadores, "batches_expiring"), href: "/almoxarifado/lotes", icon: ClipboardCheck },
    { label: "Documentos de veículo vencidos", valor: numero(indicadores, "expired_vehicle_documents"), href: "/frota/veiculos", icon: Fuel },
    { label: "Ativos sem localização", valor: numero(indicadores, "assets_without_location"), href: "/patrimonio/ativos", icon: TriangleAlert }
  ];
  const totalPendencias = pendencias.reduce((soma, item) => soma + item.valor, 0);

  const descricaoPorAtivo = new Map(ativos.data.map((linha) => [texto(linha, "id"), texto(linha, "description") || texto(linha, "internal_code")]));
  const recentes = movimentacoes.data.slice(0, 5);

  const atalhos = [
    { href: "/patrimonio/ativos/novo", titulo: "Novo ativo", descricao: "Cadastre e gere o QR Code", icon: Boxes },
    { href: "/almoxarifado/entradas/novo", titulo: "Entrada de estoque", descricao: "Registre compras e devoluções", icon: PackagePlus },
    { href: "/frota/retiradas/novo", titulo: "Retirar veículo", descricao: "Inicie uma utilização", icon: Car },
    { href: "/solicitar-material/novo", titulo: "Solicitar material", descricao: "Abra uma requisição", icon: CirclePlus }
  ];

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Visão geral</span>
          <h1 className="mb-1 mt-1.5 text-3xl font-bold tracking-tight">Painel do Inner Almox</h1>
          <p className="m-0 max-w-xl text-sm text-muted-foreground">Acompanhe recursos, pendências e movimentações da operação em um só lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/patrimonio/relatorios" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold no-underline transition-colors hover:bg-muted">
            Exportar relatórios
          </Link>
          <Link href="/patrimonio/ativos/novo" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-dark">
            <CirclePlus className="size-4" aria-hidden="true" /> Cadastrar ativo
          </Link>
        </div>
      </header>

      <section aria-label="Indicadores principais" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cartoes.map((cartao) => <MetricCard key={cartao.label} {...cartao} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <article className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Patrimônio</span>
              <h2 className="m-0 mt-1 text-lg font-semibold">Distribuição dos ativos</h2>
            </div>
            <Link href="/patrimonio" className="text-xs font-bold text-primary no-underline hover:underline">Ver detalhes</Link>
          </div>
          <StatusDonut
            total={totalAtivos}
            fatias={[
              { nome: "Em uso", valor: emUso, cor: "var(--primary)" },
              { nome: "Disponíveis", valor: disponiveis, cor: "var(--lime)" },
              { nome: "Em manutenção", valor: emManutencao, cor: "#d39a2c" },
              { nome: "Outras situações", valor: outros, cor: "#9aada4" }
            ]}
          />
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Atenção</span>
              <h2 className="m-0 mt-1 text-lg font-semibold">Pendências</h2>
            </div>
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.62rem] font-extrabold text-primary">{totalPendencias} aberta(s)</span>
          </div>
          <ul className="m-0 grid list-none gap-1 p-0">
            {pendencias.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm no-underline transition-colors hover:bg-muted">
                  <span className={item.valor > 0 ? "grid size-8 place-items-center rounded-lg bg-tint-amber text-tint-amber-ink" : "grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground"}>
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-muted-foreground">{item.label}</span>
                  <strong className={item.valor > 0 ? "text-foreground" : "text-muted-foreground"}>{item.valor}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <article className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Atividade</span>
              <h2 className="m-0 mt-1 text-lg font-semibold">Movimentações recentes</h2>
            </div>
            <Link href="/patrimonio/movimentacoes" className="text-xs font-bold text-primary no-underline hover:underline">Ver todas</Link>
          </div>
          {recentes.length === 0 ? (
            <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-border text-center">
              <p className="m-0 text-sm text-muted-foreground">Entregas, devoluções e transferências aparecerão aqui.</p>
            </div>
          ) : (
            <ul className="m-0 grid list-none gap-1 p-0">
              {recentes.map((linha, indice) => {
                const ocorrido = texto(linha, "occurred_at");
                return (
                  <li key={texto(linha, "id") || indice} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <ArrowLeftRight className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[0.82rem]">{rotuloMovimentacao[texto(linha, "type")] ?? texto(linha, "type")}</strong>
                      <small className="block truncate text-[0.7rem] text-muted-foreground">{descricaoPorAtivo.get(texto(linha, "asset_id")) ?? "Ativo removido"}</small>
                    </span>
                    <span className="shrink-0 text-[0.7rem] text-muted-foreground">{ocorrido ? dataHora.format(new Date(ocorrido)) : "—"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-4">
            <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Atalhos</span>
            <h2 className="m-0 mt-1 text-lg font-semibold">Ações rápidas</h2>
          </div>
          <div className="grid gap-1">
            {atalhos.map((atalho) => (
              <Link key={atalho.href} href={atalho.href} className="flex items-center gap-3 rounded-lg px-2 py-2.5 no-underline transition-colors hover:bg-muted">
                <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                  <atalho.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[0.8rem]">{atalho.titulo}</strong>
                  <small className="block truncate text-[0.68rem] text-muted-foreground">{atalho.descricao}</small>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
