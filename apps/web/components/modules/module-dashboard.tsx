import Link from "next/link";
import { MetricCard, type MetricTint } from "@/components/dashboard/metric-card";

const domainCopy = {
  patrimonio: { title: "Patrimônio", description: "Visão consolidada dos bens, responsabilidades e condições.", metrics: ["Total de ativos", "Em uso", "Disponíveis", "Em manutenção"], action: "/patrimonio/ativos/novo" },
  almoxarifado: { title: "Almoxarifado", description: "Saldos, consumo, validade e necessidades de reposição.", metrics: ["Valor em estoque", "Produtos ativos", "Abaixo do mínimo", "Lotes vencendo"], action: "/almoxarifado/produtos/novo" },
  frota: { title: "Frota", description: "Disponibilidade, utilização, quilometragem e custos dos veículos.", metrics: ["Veículos", "Disponíveis", "Em uso", "Revisões próximas"], action: "/frota/veiculos/novo" }
} as const;

const tints = ["emerald", "sky", "lime", "amber"] as const;

export function ModuleDashboard({ domain }: { domain: keyof typeof domainCopy }) {
  const copy = domainCopy[domain];
  return <div className="page-stack"><header className="page-header"><div><span className="page-eyebrow">Dashboard</span><h1>{copy.title}</h1><p>{copy.description}</p></div><Link className="button" href={copy.action}>Novo cadastro</Link></header><section className="metric-grid">{copy.metrics.map((label, indice) => <MetricCard key={label} label={label} value="—" detail="Aguardando dados" tint={tints[indice % tints.length] as MetricTint} />)}</section><section className="dashboard-grid"><article className="panel panel--wide"><div className="panel__header"><div><span className="panel__eyebrow">Indicadores</span><h2>Evolução no período</h2></div><button className="button button--ghost" type="button">Últimos 30 dias</button></div><div className="line-placeholder"><span>Os indicadores serão calculados a partir das movimentações reais.</span></div></article><article className="panel"><div className="panel__header"><div><span className="panel__eyebrow">Distribuição</span><h2>Por status</h2></div></div><div className="empty-list"><span className="empty-list__icon">◇</span><h3>Sem dados ainda</h3><p>Comece cadastrando o primeiro registro.</p></div></article></section></div>;
}
