import Link from "next/link";
import { fetchTenantCollection } from "@/lib/api/server";
import { apiEndpointByModule } from "@/lib/module-catalog";
import { TenantSettingsForm } from "@/components/modules/tenant-settings-form";
import { RecordActions } from "@/components/modules/record-actions";
import { ReportCenter } from "@/components/modules/report-center";

interface ModulePageProps {
  title: string;
  description: string;
  singular: string;
  path: string;
  primaryAction?: string;
  columns?: string[];
}

export async function ModulePage({ title, description, singular, path, primaryAction, columns }: ModulePageProps) {
  const isSettings = !columns;
  const isReports = path.endsWith("/relatorios");
  const endpoint = apiEndpointByModule[path];
  const collection = endpoint ? await fetchTenantCollection(endpoint) : { data: [], available: true };
  return (
    <div className="page-stack">
      <header className="page-header">
        <div><span className="page-eyebrow">{path.split("/")[0]}</span><h1>{title}</h1><p>{description}</p></div>
        {primaryAction && !isReports ? <Link className="button" href={`/${path}/novo`}>{primaryAction}</Link> : null}
      </header>
      {endpoint && !collection.available ? <div className="connection-banner"><span>!</span><div><strong>API temporariamente indisponível</strong><small>Inicie a API com <code>pnpm dev</code>. A interface continuará disponível.</small></div></div> : null}
      {isReports ? <ReportCenter path={path} /> : path==="admin/configuracoes"?<TenantSettingsForm/>:isSettings ? <SettingsPlaceholder title={title} /> : <CollectionPlaceholder path={path} singular={singular} columns={columns} records={collection.data} />}
    </div>
  );
}

function CollectionPlaceholder({ path, singular, columns = [], records }: { path:string; singular: string; columns?: string[]; records: Array<Record<string, unknown>> }) {
  const hasActions=["patrimonio/ativos","patrimonio/movimentacoes","meus-termos","patrimonio/inventarios","almoxarifado/inventarios","almoxarifado/requisicoes","notificacoes"].includes(path);
  return (
    <section className="panel data-panel">
      <div className="data-toolbar">
        <div className="filter-search"><span aria-hidden="true">⌕</span><input aria-label={`Pesquisar ${singular}`} placeholder={`Pesquisar ${singular}…`} /></div>
        <button className="button button--secondary" type="button">Filtros</button>
        <button className="button button--ghost" type="button">Exportar</button>
      </div>
      <div className="table-wrap">
        <table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}{hasActions?<th>Ações</th>:null}</tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={columns.length+(hasActions?1:0)}><div className="table-empty"><span>◇</span><strong>Nenhum {singular} encontrado</strong><small>Os registros deste tenant aparecerão aqui.</small></div></td></tr> : records.map((record,index) => <tr key={typeof record.id === "string" ? record.id : index}>{columns.map((column) => <td key={column}>{displayValue(record,column)}</td>)}{hasActions?<td><RecordActions path={path} record={record}/></td>:null}</tr>)}</tbody></table>
      </div>
      <footer className="data-footer"><span>{records.length} {records.length === 1 ? "registro" : "registros"}</span><span>Página 1 de 1</span></footer>
    </section>
  );
}

const fieldCandidates: Record<string,string[]>={"Código":["code","internal_code","number"],"Ativo":["description","asset_number"],"Categoria":["name","category"],"Responsável":["responsible_user_id","requested_by"],"Localização":["location_id","path"],"Status":["status","membership_status"],"Produto":["name","product_id"],"Saldo":["quantity","balance"],"Mínimo":["minimum_stock"],"Veículo":["model","vehicle_id"],"Placa":["plate"],"Quilometragem":["current_mileage","mileage"],"Usuário":["full_name","email"],"Filial":["name","branch_id"],"Setor":["department_id"],"Perfil":["roles"],"Fornecedor":["trade_name","legal_name","supplier_id"],"Documento":["document_number","tax_id"],"Data":["occurred_at","created_at"],"Valor":["amount","total_amount"],"Nome":["name","legal_name"]};
function displayValue(record:Record<string,unknown>,column:string):string{
  const candidates=fieldCandidates[column]??[column.toLowerCase().replaceAll(" ","_")];
  const value=candidates.map((key)=>record[key]).find((candidate)=>candidate!==undefined&&candidate!==null&&candidate!=="");
  if(value===undefined)return "—";
  if(Array.isArray(value))return value.join(", ");
  if(typeof value==="object")return "Detalhes";
  if(typeof value==="boolean")return value?"Sim":"Não";
  if(typeof value==="string"||typeof value==="number"||typeof value==="bigint")return String(value);
  return "—";
}

function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <section className="settings-grid">
      <aside className="settings-menu"><button className="settings-menu__active" type="button">Geral</button><button type="button">Identidade visual</button><button type="button">Regras e alertas</button><button type="button">Integrações</button></aside>
      <div className="panel settings-form"><div><span className="panel__eyebrow">Configuração</span><h2>{title}</h2><p>Defina os dados aplicáveis ao tenant atual.</p></div><label>Nome de exibição<input placeholder="Inner Almox" /></label><label>Descrição<textarea rows={4} placeholder="Informações complementares" /></label><div className="form-actions"><button className="button button--secondary" type="button">Cancelar</button><button className="button" type="button">Salvar alterações</button></div></div>
    </section>
  );
}
