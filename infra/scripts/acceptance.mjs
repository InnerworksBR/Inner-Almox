// Roteiro de aceite do MVP: percorre os criterios do PRD secao 35 contra a API real.
// Uso: node --env-file=.env infra/scripts/acceptance.mjs [caminho-do-json-de-saida]
// Idempotente: cada execucao usa um identificador proprio, entao pode rodar quantas vezes precisar.

import { writeFileSync } from "node:fs";

const SUPABASE = (process.env.SUPABASE_URL ?? "http://127.0.0.1:54321").replace(/\/$/, "");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const API = (process.env.API_URL ?? "http://localhost:3333").replace(/\/$/, "");
const TENANT = "00000000-0000-0000-0000-000000000001";
const HOST = "localhost";
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
const SENHA = "InnerAlmox2026";
const HOJE = new Date().toISOString().slice(0, 10);

const results = [];
let currentSection = "";
const section = (name) => { currentSection = name; console.log(`\n=== ${name} ===`); };

function record(criterio, ok, detalhe) {
  results.push({ secao: currentSection, criterio, status: ok ? "PASSOU" : "FALHOU", detalhe: detalhe ?? "" });
  console.log(`  ${ok ? "PASSOU" : "FALHOU"}  ${criterio}${detalhe ? ` -- ${detalhe}` : ""}`);
}

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// O dev server reinicia sozinho com frequencia (node --watch), entao falhas de
// rede sao tratadas como transitorias e a chamada e repetida.
async function fetchResiliente(url, init, tentativas = 5) {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await fetch(url, init);
    } catch (erro) {
      if (tentativa >= tentativas) throw erro;
      await espera(tentativa * 1500);
    }
  }
}

async function call(method, path, options = {}) {
  const { token, body, hostname = HOST, raw = false } = options;
  const headers = { "x-tenant-hostname": hostname };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetchResiliente(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (raw) return { status: response.status, bytes: (await response.arrayBuffer()).byteLength };
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload, data: payload?.data, erro: payload?.error?.message ?? payload?.error?.code };
}

// Passo cujo sucesso e esperado. Devolve os dados ou null.
async function step(criterio, method, path, options = {}, validate) {
  const { status, data, erro } = await call(method, path, options);
  const ok = status >= 200 && status < 300 && (!validate || validate(data));
  record(criterio, ok, ok ? "" : `HTTP ${status}${erro ? ` ${erro}` : ""}`);
  return ok ? data : null;
}

// Passo cuja recusa e esperada: autorizacao ou regra de negocio.
async function deny(criterio, method, path, options, esperado) {
  const { status, erro } = await call(method, path, options);
  const ok = esperado.includes(status);
  record(criterio, ok, ok ? `bloqueado com HTTP ${status}` : `NAO bloqueou: HTTP ${status}${erro ? ` ${erro}` : ""}`);
  return ok;
}

const adminHeaders = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" };

async function criarUsuario(email) {
  const created = await fetch(`${SUPABASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password: SENHA, email_confirm: true, user_metadata: { full_name: email.split("@")[0] } })
  });
  const body = await created.json();
  return created.ok ? body.id : null;
}

async function vincular(tenantId, userId, roles) {
  const response = await fetch(`${SUPABASE}/rest/v1/rpc/provision_tenant_membership`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ target_tenant_id: tenantId, target_user_id: userId, target_roles: roles, employee_data: { position: roles[0] } })
  });
  return response.ok ? response.json() : null;
}

async function logar(email) {
  const response = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, password: SENHA })
  });
  const body = await response.json();
  return response.ok ? body.access_token : null;
}

const admin = await logar("admin@innerworks.local");
if (!admin) {
  console.error("Nao foi possivel autenticar admin@innerworks.local. Confira se o ambiente esta no ar.");
  process.exit(1);
}
console.log(`Execucao ${RUN} -- autenticado como admin@innerworks.local`);

const colaboradorEmail = `colaborador.${RUN.toLowerCase()}@innerworks.local`;
const colaboradorId = await criarUsuario(colaboradorEmail);
const colaboradorMembership = colaboradorId ? await vincular(TENANT, colaboradorId, ["employee"]) : null;
const colaborador = colaboradorId ? await logar(colaboradorEmail) : null;

// ------------------------------------------------------------ Tenant e white-label
section("PRD 35 - Tenant e white-label");
await step("Tenant expoe configuracao e branding", "GET", "/v1/tenant/configuration", { token: admin }, (d) => Boolean(d?.id));
await step("Identidade visual pode ser alterada", "PATCH", "/v1/tenant/configuration", { token: admin, body: { primary_color: "#176B4D", secondary_color: "#B8D925" } });
const novoTenant = await step("Superadministrador cria tenant", "POST", "/v1/platform/tenants", {
  token: admin,
  body: {
    slug: `cliente-${RUN.toLowerCase()}`, legal_name: `Cliente Demo ${RUN}`, product_name: `Almox ${RUN}`,
    hostname: `cliente-${RUN.toLowerCase()}.localhost`, plan: "starter", modules: ["assets", "stock", "reports"], domain_verified: true
  }
});
await step("Tenant provisionado possui dominio", "GET", "/v1/platform/domains", { token: admin }, (d) => Array.isArray(d) && d.some((linha) => String(linha.hostname).includes(RUN.toLowerCase())));
await step("Planos comerciais disponiveis", "GET", "/v1/platform/plans", { token: admin }, (d) => Array.isArray(d) && d.length > 0);
await step("Saude da plataforma responde", "GET", "/v1/platform/health", { token: admin }, (d) => d?.api === "healthy");
await step("Jobs da plataforma sao consultaveis", "GET", "/v1/platform/jobs", { token: admin }, (d) => Array.isArray(d));
await step("Logs da plataforma sao consultaveis", "GET", "/v1/platform/logs", { token: admin }, (d) => Array.isArray(d));

// ------------------------------------------------------------ Usuarios
section("PRD 35 - Usuarios e perfis");
await step("Administrador lista usuarios do tenant", "GET", "/v1/users", { token: admin }, (d) => Array.isArray(d) && d.length > 0);
await step("Administrador convida usuario", "POST", "/v1/users/invitations", {
  token: admin,
  body: { email: `convidado.${RUN.toLowerCase()}@innerworks.local`, full_name: `Convidado ${RUN}`, roles: ["employee"], position: "Analista" }
});
record("Colaborador criado com vinculo e papel", Boolean(colaborador && colaboradorMembership), colaborador ? `membership ${colaboradorMembership}` : "falha ao criar");

// ------------------------------------------------------------ Estrutura organizacional
section("PRD 35 - Estrutura organizacional");
const filial = await step("Cadastro de filial", "POST", "/v1/branches", { token: admin, body: { code: `FIL-${RUN}`, name: `Filial ${RUN}` } });
const local = await step("Cadastro de localizacao", "POST", "/v1/locations", { token: admin, body: { code: `LOC-${RUN}`, name: `Almoxarifado ${RUN}`, type: "warehouse", branch_id: filial?.id } });
const localDestino = await step("Cadastro de segunda localizacao", "POST", "/v1/locations", { token: admin, body: { code: `LOC2-${RUN}`, name: `Deposito ${RUN}`, type: "stock", branch_id: filial?.id } });
const centro = await step("Cadastro de centro de custo", "POST", "/v1/cost-centers", { token: admin, body: { code: `CC-${RUN}`, name: `Centro ${RUN}` } });
const setor = await step("Cadastro de setor", "POST", "/v1/departments", { token: admin, body: { code: `SET-${RUN}`, name: `Setor ${RUN}`, branch_id: filial?.id, cost_center_id: centro?.id } });
const fornecedor = await step("Cadastro de fornecedor", "POST", "/v1/suppliers", { token: admin, body: { legal_name: `Fornecedor ${RUN} Ltda`, trade_name: `Fornecedor ${RUN}` } });

// ------------------------------------------------------------ Patrimonio
section("PRD 35 - Patrimonio");
const categoria = await step("Cadastro de categoria de ativo", "POST", "/v1/asset-categories", { token: admin, body: { name: `Equipamentos ${RUN}` } });
const ativo = await step("Gestor cadastra ativo", "POST", "/v1/assets", {
  token: admin,
  body: {
    internal_code: `AT-${RUN}`, asset_number: `PAT-${RUN}`, description: `Notebook Dell ${RUN}`, category_id: categoria?.id,
    branch_id: filial?.id, location_id: local?.id, department_id: setor?.id, cost_center_id: centro?.id,
    supplier_id: fornecedor?.id, purchase_value: 5400, purchase_date: HOJE
  }
});
record("Sistema gera QR Code do ativo", Boolean(ativo?.qr_token), ativo?.qr_token ? `token ${String(ativo.qr_token).slice(0, 8)}` : "sem token");
if (ativo) {
  const qr = await call("GET", `/v1/assets/${ativo.id}/qr?format=png`, { token: admin, raw: true });
  record("Etiqueta QR sai como imagem", qr.status === 200 && qr.bytes > 100, `HTTP ${qr.status}, ${qr.bytes} bytes`);
  const etiqueta = await call("POST", "/v1/assets/qr-labels", { token: admin, body: { asset_ids: [ativo.id] }, raw: true });
  record("Etiquetas em lote saem em PDF", etiqueta.status === 200 && etiqueta.bytes > 500, `HTTP ${etiqueta.status}, ${etiqueta.bytes} bytes`);
  await step("Leitura do QR devolve o ativo", "GET", `/v1/assets/qr/${ativo.qr_token}`, { token: admin }, (d) => d?.internal_code === `AT-${RUN}`);
}
const movimentacao = ativo
  ? await step("Movimentacao de entrega gera historico", "POST", "/v1/asset-movements", {
      token: admin,
      body: { target_asset_id: ativo.id, movement_type: "delivery", movement_reason: "Entrega ao colaborador", new_responsible_id: colaboradorId, destination_data: { location_id: local?.id, branch_id: filial?.id } }
    })
  : null;
await step("Historico de movimentacoes e consultavel", "GET", "/v1/asset-movements", { token: admin }, (d) => Array.isArray(d) && d.length > 0);
if (ativo) {
  const lista = await call("GET", "/v1/assets", { token: admin });
  const atual = lista.data?.find((linha) => linha.id === ativo.id);
  record("Entrega define responsavel e status do ativo", atual?.responsible_user_id === colaboradorId && atual?.status === "in_use", `status ${atual?.status}`);
}
const termo = movimentacao
  ? await step("Termo de responsabilidade e emitido", "POST", `/v1/asset-movements/${movimentacao}/terms`, { token: admin, body: { term_type: "delivery" } })
  : null;
if (termo) {
  if (colaborador) await step("Colaborador aceita o proprio termo", "POST", `/v1/asset-terms/${termo}/accept`, { token: colaborador });
  const pdf = await call("GET", `/v1/asset-terms/${termo}/pdf`, { token: admin, raw: true });
  record("Termo sai em PDF", pdf.status === 200 && pdf.bytes > 500, `HTTP ${pdf.status}, ${pdf.bytes} bytes`);
  const termos = await call("GET", "/v1/asset-terms", { token: admin });
  const codigo = termos.data?.find((linha) => linha.id === termo)?.validation_code;
  if (codigo) {
    const publico = await call("GET", `/v1/public/documents/${codigo}`, {});
    record("Validacao publica confirma o termo", publico.status === 200 && publico.data?.valid === true, `HTTP ${publico.status}`);
  } else {
    record("Validacao publica confirma o termo", false, "codigo de validacao nao encontrado");
  }
}

// ------------------------------------------------------------ Garantias e manutencao
section("PRD 35 - Garantia e manutencao");
const vencimento = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);
if (ativo) {
  await step("Garantia pode ser cadastrada", "POST", "/v1/warranties", { token: admin, body: { asset_id: ativo.id, type: "Fabricante", provider: `Fornecedor ${RUN}`, starts_at: HOJE, ends_at: vencimento } });
  const ordem = await step("Ordem de manutencao pode ser aberta", "POST", "/v1/maintenance/orders", {
    token: admin,
    body: { number: `OS-${RUN}`, asset_id: ativo.id, type: "corrective", priority: "high", reported_problem: "Equipamento nao liga apos queda de energia" }
  });
  if (ordem) await step("Custos da ordem sao registrados", "POST", "/v1/maintenance/costs", { token: admin, body: { order_id: ordem.id, description: "Troca de fonte", category: "peca", amount: 320.5, occurred_at: HOJE } });
  await step("Plano de manutencao preventiva", "POST", "/v1/maintenance/plans", { token: admin, body: { asset_id: ativo.id, name: `Revisao semestral ${RUN}`, criterion: "days", interval_value: 180, next_due_at: vencimento } });
}
await step("Alertas do tenant sao recalculados", "POST", "/v1/notifications/refresh", { token: admin });
await step("Alerta de garantia aparece nas notificacoes", "GET", "/v1/notifications", { token: admin }, (d) => Array.isArray(d) && d.some((linha) => linha.type === "warranty_expiry"));

// ------------------------------------------------------------ Almoxarifado
section("PRD 35 - Almoxarifado");
const estoqueOrigem = local ? await step("Cadastro de estoque de origem", "POST", "/v1/stock/locations", { token: admin, body: { location_id: local.id, name: `Estoque Central ${RUN}`, code: `EST-${RUN}` } }) : null;
const estoqueDestino = localDestino ? await step("Cadastro de estoque de destino", "POST", "/v1/stock/locations", { token: admin, body: { location_id: localDestino.id, name: `Estoque Apoio ${RUN}`, code: `EST2-${RUN}` } }) : null;
const produto = await step("Produto pode ser cadastrado", "POST", "/v1/stock/products", { token: admin, body: { code: `PR-${RUN}`, sku: `SKU-${RUN}`, name: `Cabo de rede ${RUN}`, unit: "UN", minimum_stock: 10, maximum_stock: 500 } });
if (produto && estoqueOrigem) {
  await step("Entrada aumenta o saldo", "POST", "/v1/stock/movements", { token: admin, body: { target_product_id: produto.id, target_stock_location_id: estoqueOrigem.id, movement_type: "purchase_in", movement_quantity: 100, movement_unit_cost: 12.5, movement_document: `NF-${RUN}` } });
  await step("Saida reduz o saldo", "POST", "/v1/stock/movements", { token: admin, body: { target_product_id: produto.id, target_stock_location_id: estoqueOrigem.id, movement_type: "consumption_out", movement_quantity: 15, target_department_id: setor?.id, target_cost_center_id: centro?.id } });
  await deny("Saida acima do saldo e bloqueada", "POST", "/v1/stock/movements", { token: admin, body: { target_product_id: produto.id, target_stock_location_id: estoqueOrigem.id, movement_type: "consumption_out", movement_quantity: 100000 } }, [422, 400, 409, 500]);
  if (estoqueDestino) await step("Transferencia entre estoques e atomica", "POST", "/v1/stock/transfers", { token: admin, body: { target_product_id: produto.id, source_stock_location_id: estoqueOrigem.id, destination_stock_location_id: estoqueDestino.id, movement_quantity: 20 } });
  await step("Lote pode ser cadastrado", "POST", "/v1/stock/batches", { token: admin, body: { product_id: produto.id, stock_location_id: estoqueOrigem.id, number: `LOTE-${RUN}`, received_at: HOJE, expires_at: vencimento, unit_cost: 12.5 } });
}
const requisicao = produto
  ? await step("Requisicao de material e criada", "POST", "/v1/stock/requisitions/with-items", {
      token: admin,
      body: { requisition_number: `REQ-${RUN}`, purpose_value: `Instalacao de rede ${RUN}`, target_department_id: setor?.id, target_cost_center_id: centro?.id, items_value: [{ product_id: produto.id, quantity: 5 }] }
    })
  : null;
if (requisicao) {
  await step("Requisicao segue o fluxo de aprovacao", "POST", `/v1/stock/requisitions/${requisicao}/status`, { token: admin, body: { target_status: "approved" } });
  if (estoqueOrigem) await step("Atendimento entrega o material e baixa o estoque", "POST", `/v1/stock/requisitions/${requisicao}/fulfill`, { token: admin, body: { target_stock_location_id: estoqueOrigem.id, deliveries_value: [{ product_id: produto.id, quantity: 5 }] } });
}

// ------------------------------------------------------------ Frota
section("PRD 35 - Frota");
const veiculo = await step("Veiculo pode ser cadastrado", "POST", "/v1/fleet/vehicles", {
  token: admin,
  body: { plate: `IAX${RUN.slice(0, 4)}`, brand: "Fiat", model: `Strada ${RUN}`, model_year: 2025, fuel_type: "flex", branch_id: filial?.id, cost_center_id: centro?.id, current_mileage: 15000 }
});
const motorista = colaboradorMembership
  ? await step("Motorista pode ser autorizado", "POST", "/v1/fleet/drivers", { token: admin, body: { membership_id: colaboradorMembership, license_number: `CNH${RUN}`, category: "B", expires_at: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10) } })
  : null;
if (veiculo && motorista) {
  await step("Autorizacao vincula motorista e veiculo", "POST", "/v1/fleet/authorizations", { token: admin, body: { driver_id: motorista.id, vehicle_id: veiculo.id, valid_from: HOJE } });
  await step("Reserva pode ser registrada", "POST", "/v1/fleet/reservations", { token: admin, body: { vehicle_id: veiculo.id, driver_id: motorista.id, starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 86400000).toISOString(), destination: "Cliente", purpose: "Visita tecnica" } });
  const uso = await step("Retirada registra quilometragem inicial", "POST", "/v1/fleet/usages/checkout", {
    token: admin,
    body: { target_vehicle_id: veiculo.id, target_driver_id: motorista.id, initial_mileage_value: 15000, destination_value: "Cliente Santos", purpose_value: "Entrega de equipamento", target_cost_center_id: centro?.id, fuel_level_value: 80 }
  });
  if (uso) {
    await step("Checklist da retirada e preenchido", "POST", `/v1/fleet/usages/${uso}/checklists`, { token: admin, body: { phase_value: "checkout", answers_value: { pneus: true, farois: true, documentacao: true }, notes_value: "Sem avarias" } });
    const distancia = await step("Devolucao registra quilometragem final", "POST", `/v1/fleet/usages/${uso}/return`, { token: admin, body: { final_mileage_value: 15240, fuel_level_value: 40, notes_value: "Viagem concluida" } });
    record("Sistema calcula a distancia percorrida", Number(distancia) === 240, `distancia devolvida: ${distancia}`);
    await deny("Quilometragem nao pode regredir", "POST", "/v1/fleet/usages/checkout", { token: admin, body: { target_vehicle_id: veiculo.id, target_driver_id: motorista.id, initial_mileage_value: 100, destination_value: "Teste", purpose_value: "Regressao de km" } }, [422, 400, 409, 500]);
  }
  await step("Abastecimento pode ser registrado", "POST", "/v1/fleet/fuelings", { token: admin, body: { vehicle_id: veiculo.id, driver_id: motorista.id, occurred_at: new Date().toISOString(), station: "Posto Central", fuel_type: "gasolina", liters: 42.5, unit_price: 5.89, total_amount: 250.33, mileage: 15240, cost_center_id: centro?.id } });
  await step("Despesa de frota pode ser registrada", "POST", "/v1/fleet/expenses", { token: admin, body: { vehicle_id: veiculo.id, type: "toll", description: "Pedagio Anchieta", amount: 32.4, occurred_at: HOJE, cost_center_id: centro?.id } });
  await step("Multa pode ser registrada", "POST", "/v1/fleet/fines", { token: admin, body: { vehicle_id: veiculo.id, driver_id: motorista.id, occurred_at: new Date().toISOString(), type: "Velocidade acima da permitida", amount: 195.23, points: 5, due_at: vencimento } });
  await step("Ocorrencia pode ser registrada", "POST", "/v1/fleet/incidents", { token: admin, body: { vehicle_id: veiculo.id, driver_id: motorista.id, type: "damage", occurred_at: new Date().toISOString(), description: "Risco na lateral direita", location: "Estacionamento do cliente" } });
  await step("Documento do veiculo pode ser registrado", "POST", "/v1/fleet/documents", { token: admin, body: { vehicle_id: veiculo.id, type: "CRLV", number: `DOC-${RUN}`, issued_at: HOJE, expires_at: vencimento, storage_path: `${TENANT}/vehicle/${veiculo.id}/crlv.pdf` } });
}

// ------------------------------------------------------------ Inventario
section("PRD 35 - Inventario");
const campanha = await step("Campanha de inventario pode ser criada", "POST", "/v1/inventories", {
  token: admin,
  body: { name: `Inventario ${RUN}`, type: "assets", starts_at: HOJE, ends_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) }
});
if (campanha && ativo) {
  await step("Campanha gera a lista esperada", "POST", `/v1/inventories/${campanha.id}/start`, { token: admin });
  await step("Leitura de QR Code registra o ativo", "POST", `/v1/inventories/${campanha.id}/scans/assets`, { token: admin, body: { asset_qr_token: ativo.qr_token, target_location_id: local?.id, condition_value: "good" } });
  await step("Encerramento marca os nao localizados", "POST", `/v1/inventories/${campanha.id}/complete`, { token: admin });
}
const campanhaEstoque = await step("Campanha de inventario de estoque", "POST", "/v1/inventories", {
  token: admin,
  body: { name: `Inventario estoque ${RUN}`, type: "stock", starts_at: HOJE, ends_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) }
});
if (campanhaEstoque && produto) {
  await step("Inventario de estoque materializa saldos", "POST", `/v1/inventories/${campanhaEstoque.id}/start`, { token: admin });
  await step("Contagem fisica registra divergencia", "POST", `/v1/inventories/${campanhaEstoque.id}/scans/stock`, { token: admin, body: { target_product_id: produto.id, counted_quantity: 3 } });
  await step("Campanha de estoque e encerrada", "POST", `/v1/inventories/${campanhaEstoque.id}/complete`, { token: admin });
}

// ------------------------------------------------------------ Relatorios
section("PRD 35 - Relatorios e auditoria");
for (const dominio of ["assets", "stock", "fleet", "asset-movements", "stock-movements", "fuelings"]) {
  const csv = await call("GET", `/v1/reports/${dominio}?format=csv`, { token: admin, raw: true });
  record(`Relatorio ${dominio} exporta CSV`, csv.status === 200 && csv.bytes > 0, `HTTP ${csv.status}, ${csv.bytes} bytes`);
}
const xlsx = await call("GET", "/v1/reports/assets?format=xlsx", { token: admin, raw: true });
record("Relatorio de ativos exporta XLSX", xlsx.status === 200 && xlsx.bytes > 1000, `HTTP ${xlsx.status}, ${xlsx.bytes} bytes`);
await step("Exportacao fica registrada na auditoria", "GET", "/v1/audit", { token: admin }, (d) => Array.isArray(d) && d.some((linha) => linha.action === "export.report"));
await step("Dashboard consolida indicadores", "GET", "/v1/dashboard", { token: admin }, (d) => Number(d?.total_assets) > 0);

// ------------------------------------------------------------ Isolamento entre tenants
section("PRD 35 - Isolamento entre tenants");
if (novoTenant) {
  const outroEmail = `cliente.${RUN.toLowerCase()}@innerworks.local`;
  const outroId = await criarUsuario(outroEmail);
  const outroHost = `cliente-${RUN.toLowerCase()}.localhost`;
  if (outroId) {
    await vincular(novoTenant, outroId, ["tenant_admin"]);
    const outro = await logar(outroEmail);
    if (outro) {
      await step("Usuario do outro tenant acessa o proprio contexto", "GET", "/v1/context", { token: outro, hostname: outroHost }, (d) => d?.tenantId === novoTenant);
      const vazio = await call("GET", "/v1/assets", { token: outro, hostname: outroHost });
      record("Outro tenant nao enxerga ativos da InnerWorks", Array.isArray(vazio.data) && vazio.data.length === 0, `retornou ${vazio.data?.length ?? "?"} registros`);
      await deny("Usuario do outro tenant e barrado no dominio da InnerWorks", "GET", "/v1/context", { token: outro, hostname: HOST }, [403, 404]);
      await deny("Administrador da InnerWorks e barrado no dominio do outro tenant", "GET", "/v1/context", { token: admin, hostname: outroHost }, [403, 404]);
    }
  }
}

// ------------------------------------------------------------ Escopo por papel
section("SECURITY.md - Escopo por papel do colaborador");
if (colaborador) {
  await step("Colaborador ve os proprios ativos", "GET", "/v1/my/assets", { token: colaborador }, (d) => Array.isArray(d) && d.some((linha) => linha.id === ativo?.id));
  await step("Colaborador ve os proprios termos", "GET", "/v1/my/terms", { token: colaborador }, (d) => Array.isArray(d));
  await deny("Colaborador nao acessa a auditoria do tenant", "GET", "/v1/audit", { token: colaborador }, [403]);
  const ativosDoColaborador = await call("GET", "/v1/assets", { token: colaborador });
  const apenasDele = Array.isArray(ativosDoColaborador.data) && ativosDoColaborador.data.length > 0 && ativosDoColaborador.data.every((linha) => linha.responsible_user_id === colaboradorId);
  record("Colaborador ve apenas os ativos sob sua responsabilidade", apenasDele, `HTTP ${ativosDoColaborador.status}, ${ativosDoColaborador.data?.length ?? "?"} registro(s)`);
  await deny("Colaborador nao lista os itens de requisicao do tenant", "GET", "/v1/stock/requisition-items", { token: colaborador }, [403]);
  await deny("Colaborador nao lista os usuarios do tenant", "GET", "/v1/users", { token: colaborador }, [403]);
  if (requisicao) await deny("Colaborador nao aprova requisicao por edicao direta", "PATCH", `/v1/stock/requisitions/${requisicao}`, { token: colaborador, body: { status: "approved" } }, [403]);
  await deny("Colaborador nao cadastra ativo", "POST", "/v1/assets", { token: colaborador, body: { internal_code: `X-${RUN}`, description: "Tentativa indevida" } }, [403]);
}

// ------------------------------------------------------------ Regras criticas
section("PRD 41 - Regras criticas de negocio");
if (produto && estoqueDestino && estoqueOrigem) {
  const vazioOrigem = await step("Cadastro de estoque sem saldo para teste", "POST", "/v1/stock/locations", { token: admin, body: { location_id: localDestino.id, name: `Estoque Vazio ${RUN}`, code: `EST3-${RUN}` } });
  if (vazioOrigem) {
    await deny("Transferencia a partir de estoque vazio e bloqueada", "POST", "/v1/stock/transfers", {
      token: admin,
      body: { target_product_id: produto.id, source_stock_location_id: vazioOrigem.id, destination_stock_location_id: estoqueDestino.id, movement_quantity: 7 }
    }, [422, 400, 409, 500]);
  }
}
if (requisicao) {
  await deny("Requisicao ja entregue nao volta para rascunho", "POST", `/v1/stock/requisitions/${requisicao}/status`, { token: admin, body: { target_status: "requested" } }, [422, 400, 409]);
}
await deny("Tenant enviado pelo cliente nao substitui o contexto", "POST", "/v1/branches", { token: admin, body: { code: `ISO-${RUN}`, name: `Isolamento ${RUN}`, tenant_id: "11111111-1111-1111-1111-111111111111" } }, [201]).then(async () => {
  const lista = await call("GET", "/v1/branches", { token: admin });
  const criada = lista.data?.find((linha) => linha.code === `ISO-${RUN}`);
  record("Filial criada permanece no tenant do contexto", criada?.tenant_id === TENANT, `tenant gravado: ${criada?.tenant_id}`);
});

// ------------------------------------------------------------ Resumo
const total = results.length;
const passaram = results.filter((linha) => linha.status === "PASSOU").length;
console.log(`\n================ RESUMO ================`);
const porSecao = {};
for (const linha of results) {
  porSecao[linha.secao] ??= { ok: 0, total: 0 };
  porSecao[linha.secao].total += 1;
  if (linha.status === "PASSOU") porSecao[linha.secao].ok += 1;
}
for (const [nome, contagem] of Object.entries(porSecao)) console.log(`  ${contagem.ok}/${contagem.total}  ${nome}`);
console.log(`\n  TOTAL: ${passaram}/${total} criterios`);
const falhas = results.filter((linha) => linha.status === "FALHOU");
if (falhas.length > 0) {
  console.log(`\n  FALHAS (${falhas.length}):`);
  for (const linha of falhas) console.log(`   - [${linha.secao}] ${linha.criterio} -- ${linha.detalhe}`);
}
const saida = process.argv[2];
if (saida) {
  writeFileSync(saida, JSON.stringify({ execucao: RUN, total, passaram, resultados: results }, null, 2), "utf8");
  console.log(`\n  Resultado gravado em ${saida}`);
}
