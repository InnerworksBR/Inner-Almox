import Link from "next/link";
import { CirclePlus } from "lucide-react";

import { DataTable } from "@/components/modules/data-table";
import { RecordActions } from "@/components/modules/record-actions";
import { ReportCenter } from "@/components/modules/report-center";
import { ProfileForm } from "@/components/modules/profile-form";
import { TenantSettingsForm } from "@/components/modules/tenant-settings-form";
import { PermissionsMatrix } from "@/components/modules/permissions-matrix";
import { fetchTenantCollection } from "@/lib/api/server";
import { colunasDe, rotasSemBusca } from "@/lib/columns";
import { apiEndpointByModule, filtrosFixosPorModulo } from "@/lib/module-catalog";
import type { Consulta } from "@/lib/query";

interface ModulePageProps {
  title: string;
  description: string;
  singular: string;
  path: string;
  primaryAction?: string;
  columns?: string[];
  consulta?: Consulta;
}

/** Telas cujas linhas oferecem ações contextuais (QR, termo, leitura de inventário…). */
const comAcoes = ["patrimonio/ativos", "patrimonio/movimentacoes", "meus-termos", "patrimonio/inventarios", "almoxarifado/inventarios", "almoxarifado/requisicoes", "notificacoes"];

export async function ModulePage({ title, description, singular, path, primaryAction, columns, consulta = {} }: ModulePageProps) {
  const isSettings = !columns;
  const isReports = path.endsWith("/relatorios");
  const endpoint = apiEndpointByModule[path];
  const colunas = colunasDe(path);

  const pagina = Number(consulta.pagina ?? "1") || 1;
  const tamanho = Number(consulta.tamanho ?? "25") || 25;
  const aceitaConsulta = !rotasSemBusca.has(path);
  const colecao = endpoint && !isReports && !isSettings
    ? await fetchTenantCollection(endpoint, aceitaConsulta ? {
        ...filtrosFixosPorModulo[path],
        busca: consulta.busca,
        ordenar: consulta.ordenar,
        direcao: consulta.direcao,
        pagina: String(pagina),
        tamanho: String(tamanho)
      } : {})
    : { data: [], total: 0, available: true };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">{path.split("/")[0]}</span>
          <h1 className="mb-1 mt-1.5 text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
          <p className="m-0 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {path === "admin/usuarios" ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/usuarios/novo?modo=direto" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-dark">
              <CirclePlus className="size-4" aria-hidden="true" /> Cadastrar usuário
            </Link>
            <Link href="/admin/usuarios/novo" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted">
              Convidar usuário
            </Link>
          </div>
        ) : primaryAction && !isReports && !isSettings ? (
          <Link href={`/${path}/novo`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primary-dark">
            <CirclePlus className="size-4" aria-hidden="true" /> {primaryAction}
          </Link>
        ) : null}
      </header>

      {endpoint && !colecao.available && !isReports && !isSettings ? (
        <div className="flex items-center gap-3 rounded-xl border border-tint-amber-ink/30 bg-tint-amber px-4 py-3 text-tint-amber-ink">
          <span className="grid size-7 shrink-0 place-items-center rounded-full border border-current font-bold">!</span>
          <div>
            <strong className="block text-sm">API temporariamente indisponível</strong>
            <small className="block text-xs">Inicie a API com <code>pnpm dev</code>. A interface continua disponível.</small>
          </div>
        </div>
      ) : null}

      {isReports ? (
        <ReportCenter path={path} />
      ) : path === "perfil" ? (
        <ProfileForm />
      ) : path === "admin/configuracoes" ? (
        <TenantSettingsForm />
      ) : path === "admin/permissoes" ? (
        <PermissionsMatrix />
      ) : isSettings ? (
        <SettingsPlaceholder title={title} />
      ) : colunas ? (
        <DataTable
          rota={path}
          singular={singular}
          colunas={colunas}
          linhas={colecao.data}
          consulta={consulta}
          total={colecao.total}
          pagina={pagina}
          tamanho={tamanho}
          comAcoes={comAcoes.includes(path)}
          permiteBusca={!rotasSemBusca.has(path)}
        />
      ) : (
        <CollectionPlaceholder path={path} singular={singular} columns={columns} records={colecao.data} />
      )}
    </div>
  );
}

// Caminho legado, ainda usado pelas telas que não foram migradas para o catálogo de colunas.
function CollectionPlaceholder({ path, singular, columns = [], records }: { path: string; singular: string; columns?: string[]; records: Array<Record<string, unknown>> }) {
  const hasActions = comAcoes.includes(path);
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
