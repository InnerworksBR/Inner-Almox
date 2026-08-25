import Link from "next/link";
import { MetricCard } from "@/components/dashboard/metric-card";
import { fetchTenantRecord } from "@/lib/api/server";

function number(metrics:Record<string,unknown>|null,key:string):number{return typeof metrics?.[key]==="number"?metrics[key]:0;}
export default async function DashboardPage() {
  const data=await fetchTenantRecord("dashboard");
  const metrics=[
    {label:"Total de ativos",value:String(number(data,"total_assets")),detail:`${number(data,"assets_available")} disponíveis`},
    {label:"Valor do patrimônio",value:new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(number(data,"asset_value")),detail:"Valor de aquisição"},
    {label:"Estoque crítico",value:String(number(data,"stock_below_minimum")),detail:number(data,"stock_below_minimum")?"Requer atenção":"Nenhum alerta",tone:number(data,"stock_below_minimum")?"warning" as const:"success" as const},
    {label:"Veículos em uso",value:String(number(data,"vehicles_in_use")),detail:`${number(data,"vehicles_available")} disponíveis`}
  ];
  return (
    <div className="page-stack">
      <header className="page-header">
        <div><span className="page-eyebrow">Visão geral</span><h1>Bom dia, equipe InnerWorks</h1><p>Acompanhe os recursos e as pendências da operação em um só lugar.</p></div>
        <div className="page-actions"><button className="button button--secondary" type="button">Exportar visão</button><Link className="button" href="/patrimonio/ativos/novo">Cadastrar ativo</Link></div>
      </header>
      <section className="metric-grid" aria-label="Indicadores principais">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>
      <section className="dashboard-grid">
        <article className="panel panel--wide">
          <div className="panel__header"><div><span className="panel__eyebrow">Patrimônio</span><h2>Distribuição dos ativos</h2></div><Link href="/patrimonio">Ver detalhes</Link></div>
          <div className="empty-chart">
            <div className="donut-placeholder"><span>0</span><small>ativos</small></div>
            <div><h3>Seu panorama aparecerá aqui</h3><p>Cadastre ativos para visualizar a distribuição por status, categoria, filial e setor.</p><Link className="text-link" href="/patrimonio/ativos/novo">Cadastrar primeiro ativo →</Link></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel__header"><div><span className="panel__eyebrow">Atenção</span><h2>Pendências</h2></div><span className="status-pill">0 abertas</span></div>
          <div className="empty-list"><span className="empty-list__icon">✓</span><h3>Tudo em ordem</h3><p>Garantias, documentos, estoque e manutenções que exigirem atenção aparecerão aqui.</p></div>
        </article>
        <article className="panel panel--wide">
          <div className="panel__header"><div><span className="panel__eyebrow">Atividade</span><h2>Movimentações recentes</h2></div><Link href="/admin/auditoria">Ver auditoria</Link></div>
          <div className="empty-table"><span>Nenhuma movimentação registrada.</span><small>Entregas, devoluções, entradas, saídas e retiradas serão exibidas aqui.</small></div>
        </article>
        <article className="panel quick-actions">
          <div className="panel__header"><div><span className="panel__eyebrow">Atalhos</span><h2>Ações rápidas</h2></div></div>
          <Link href="/patrimonio/ativos/novo"><span>AT</span><div><strong>Novo ativo</strong><small>Cadastre e gere QR Code</small></div><b>›</b></Link>
          <Link href="/almoxarifado/entradas"><span>EN</span><div><strong>Entrada de estoque</strong><small>Atualize produtos e lotes</small></div><b>›</b></Link>
          <Link href="/frota/retiradas"><span>VE</span><div><strong>Retirar veículo</strong><small>Inicie uma utilização</small></div><b>›</b></Link>
        </article>
      </section>
    </div>
  );
}
