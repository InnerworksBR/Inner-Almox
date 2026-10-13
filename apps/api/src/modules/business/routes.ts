import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../../errors/app-error";
import { requireTenantContext } from "../../middleware/require-tenant-context";
import { requireTenantRole } from "../../middleware/require-role";
import type { ListOptions, TenantResourceService, TenantResourceTable } from "../../services/tenant-resource-service";
import { consultaDe } from "../../services/resource-query-config";
import type { ContextResolver, TenantContext } from "../../types/context";

interface BusinessRouteOptions { contextResolver: ContextResolver; resourceService: TenantResourceService }
type BusinessTable = Exclude<TenantResourceTable, "branches" | "departments" | "cost_centers" | "locations" | "suppliers">;
type Role = "tenant_admin" | "asset_manager" | "warehouse_manager" | "fleet_manager" | "maintenance_manager" | "department_manager" | "employee" | "auditor";
const id = z.uuid();
const optionalId = id.nullable().optional();
const text = z.string().trim().min(1).max(300);
const money = z.number().min(0);

const schemas: Partial<Record<BusinessTable, z.ZodObject>> = {
  asset_categories: z.object({ name: text.max(160), parent_id: optionalId, description: z.string().trim().max(2000).optional(), status: z.enum(["active","inactive"]).optional() }),
  assets: z.object({ internal_code: text.max(80).optional(), asset_number: z.string().trim().max(80).optional(), serial_number: z.string().trim().max(160).optional(), category_id: optionalId, brand: z.string().trim().max(120).optional(), model: z.string().trim().max(160).optional(), description: text.max(500), condition: z.enum(["new","good","fair","poor","damaged"]).optional(), status: z.enum(["available","in_use","reserved","loaned","in_maintenance","awaiting_maintenance","in_transfer","lost","damaged","obsolete","disposed","sold","donated"]).optional(), branch_id: optionalId, location_id: optionalId, department_id: optionalId, cost_center_id: optionalId, responsible_user_id: optionalId, supplier_id: optionalId, purchase_date: z.iso.date().optional(), purchase_value: money.optional(), invoice_number: z.string().trim().max(120).optional(), warranty_starts_at: z.iso.date().optional(), warranty_ends_at: z.iso.date().optional(), estimated_life_months: z.number().int().positive().optional(), notes: z.string().trim().max(5000).optional() }),
  asset_custom_fields: z.object({ category_id: optionalId, name: text.max(160), field_key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/), field_type: z.enum(["text","number","date","boolean","select"]), options: z.array(z.string().max(160)).max(100).optional(), required: z.boolean().optional(), position: z.number().int().min(0).optional() }),
  asset_custom_values: z.object({ asset_id: id, field_id: id, value: z.unknown() }),
  asset_files: z.object({ asset_id: id, kind: z.enum(["image","invoice","warranty","contract","manual","report","certificate","other"]), name: text.max(200), storage_path: text.max(1000), mime_type: z.string().trim().max(160).optional(), size_bytes: z.number().int().min(0).optional(), expires_at: z.iso.date().optional() }),
  warranties: z.object({ asset_id: id, supplier_id: optionalId, type: text.max(100), provider: z.string().trim().max(160).optional(), starts_at: z.iso.date().optional(), ends_at: z.iso.date(), coverage: z.string().trim().max(3000).optional(), document_path: z.string().trim().max(1000).optional(), notes: z.string().trim().max(3000).optional(), status: z.enum(["active","expired","cancelled"]).optional() }),
  maintenance_plans: z.object({ asset_id: id, name: text.max(160), criterion: z.enum(["date","days","mileage","hours","cycles","manufacturer"]), interval_value: z.number().int().positive().optional(), next_due_at: z.iso.date().optional(), next_due_measure: money.optional(), instructions: z.string().trim().max(5000).optional(), active: z.boolean().optional() }),
  maintenance_orders: z.object({ number: text.max(80), asset_id: id, plan_id: optionalId, supplier_id: optionalId, type: z.enum(["preventive","corrective","inspection","calibration","revision","cleaning","update","part_replacement"]), priority: z.enum(["low","normal","high","urgent"]).optional(), reported_problem: text.max(5000), diagnosis: z.string().trim().max(5000).optional(), solution: z.string().trim().max(5000).optional(), assigned_to: optionalId, expected_at: z.iso.datetime().optional(), parts_cost: money.optional(), service_cost: money.optional(), status: z.enum(["open","analysis","awaiting_approval","awaiting_supplier","awaiting_part","in_progress","completed","cancelled"]).optional() }),
  maintenance_costs: z.object({ order_id: id, description: text.max(500), category: text.max(100), amount: money, occurred_at: z.iso.date().optional() }),
  stock_categories: z.object({ name: text.max(160), parent_id: optionalId, status: z.enum(["active","inactive"]).optional() }),
  stock_locations: z.object({ location_id: id, name: text.max(160), code: text.max(50).optional(), status: z.enum(["active","inactive"]).optional() }),
  stock_products: z.object({ code: text.max(80).optional(), sku: z.string().trim().max(100).optional(), name: text.max(200), category_id: optionalId, unit: text.max(30), brand: z.string().trim().max(120).optional(), manufacturer: z.string().trim().max(160).optional(), minimum_stock: money.optional(), maximum_stock: money.optional(), reorder_point: money.optional(), average_cost: money.optional(), batch_control: z.boolean().optional(), expiry_control: z.boolean().optional(), preferred_supplier_id: optionalId, barcode: z.string().trim().max(120).optional(), status: z.enum(["active","inactive"]).optional() }),
  stock_batches: z.object({ product_id: id, stock_location_id: id, supplier_id: optionalId, number: text.max(120), received_at: z.iso.date().optional(), expires_at: z.iso.date().optional(), unit_cost: money.optional() }),
  stock_requisitions: z.object({ number: text.max(80), department_id: optionalId, cost_center_id: optionalId, purpose: text.max(2000), status: z.enum(["draft","requested","awaiting_approval","approved","rejected","separating","ready","delivered","partially_fulfilled","cancelled"]).optional() }),
  stock_requisition_items: z.object({ requisition_id: id, product_id: id, requested_quantity: z.number().positive(), approved_quantity: money.optional(), delivered_quantity: money.optional(), notes: z.string().trim().max(2000).optional() }),
  vehicles: z.object({ plate: text.max(12), renavam: z.string().trim().max(30).optional(), chassis: z.string().trim().max(50).optional(), brand: text.max(100), model: text.max(120), model_year: z.number().int().min(1900).max(2200).optional(), color: z.string().trim().max(60).optional(), type: z.string().trim().max(60).optional(), fuel_type: z.string().trim().max(60).optional(), capacity: z.number().int().positive().optional(), branch_id: optionalId, cost_center_id: optionalId, status: z.enum(["available","in_use","reserved","in_maintenance","unavailable","damaged","sold","returned_to_lessor"]).optional(), current_mileage: money.optional(), acquired_at: z.iso.date().optional(), purchase_value: money.optional(), ownership_type: z.string().trim().max(80).optional(), lessor: z.string().trim().max(160).optional(), policy_number: z.string().trim().max(100).optional() }),
  vehicle_drivers: z.object({ membership_id: z.guid(), license_number: text.max(50), category: text.max(10), expires_at: z.iso.date(), restrictions: z.array(z.string().trim().max(120)).max(20).optional(), status: z.enum(["active","suspended","inactive"]).optional() }),
  vehicle_authorizations: z.object({ driver_id: id, vehicle_id: optionalId, vehicle_type: z.string().trim().max(80).optional(), valid_from: z.iso.date().optional(), valid_until: z.iso.date().optional(), active: z.boolean().optional() }),
  vehicle_reservations: z.object({ vehicle_id: id, driver_id: id, starts_at: z.iso.datetime(), ends_at: z.iso.datetime(), destination: z.string().trim().max(500).optional(), purpose: text.max(1000), status: z.enum(["requested","approved","rejected","cancelled","in_use","completed"]).optional() }),
  vehicle_fuelings: z.object({ vehicle_id: id, driver_id: optionalId, occurred_at: z.iso.datetime(), station: z.string().trim().max(160).optional(), fuel_type: text.max(60), liters: z.number().positive(), unit_price: money, total_amount: money, mileage: money, receipt_path: z.string().trim().max(1000).optional(), cost_center_id: optionalId }),
  vehicle_expenses: z.object({ vehicle_id: id, type: z.enum(["toll","parking","washing","fine","insurance","licensing","tire","maintenance","rental","other"]), description: text.max(1000), amount: money, occurred_at: z.iso.date(), supplier_id: optionalId, cost_center_id: optionalId, receipt_path: z.string().trim().max(1000).optional() }),
  vehicle_fines: z.object({ vehicle_id: id, driver_id: optionalId, occurred_at: z.iso.datetime(), location: z.string().trim().max(500).optional(), type: text.max(160), amount: money, points: z.number().int().min(0).max(20).optional(), document_path: z.string().trim().max(1000).optional(), status: z.enum(["open","appealed","paid","cancelled"]).optional(), payment_responsible: z.string().trim().max(160).optional(), due_at: z.iso.date().optional(), appeal_notes: z.string().trim().max(3000).optional() }),
  vehicle_incidents: z.object({ vehicle_id: id, driver_id: optionalId, type: z.enum(["accident","damage","theft","breakdown","misuse","mileage_divergence","out_of_fuel","late_return"]), occurred_at: z.iso.datetime(), description: text.max(5000), location: z.string().trim().max(500).optional(), status: z.enum(["open","investigating","resolved","cancelled"]).optional() }),
  vehicle_documents: z.object({ vehicle_id: id, type: text.max(100), number: z.string().trim().max(120).optional(), issued_at: z.iso.date().optional(), expires_at: z.iso.date().optional(), storage_path: text.max(1000), status: z.enum(["valid","expired","cancelled"]).optional() }),
  inventory_campaigns: z.object({ name: text.max(200), type: z.enum(["assets","stock"]).optional(), starts_at: z.iso.date(), ends_at: z.iso.date(), scope: z.record(z.string(),z.unknown()).optional(), rules: z.record(z.string(),z.unknown()).optional(), status: z.enum(["draft","planned","active","reconciling","completed","cancelled"]).optional() }),
  notification_templates: z.object({ event_key: z.string().trim().regex(/^[a-z][a-z0-9_.-]*$/), channel: z.enum(["internal","email"]), subject: z.string().trim().max(200).optional(), body: text.max(10000), enabled: z.boolean().optional() })
};

const resources: ReadonlyArray<{ path: string; table: keyof typeof schemas; roles: readonly Role[]; actorField?: string }> = [
  { path:"asset-categories",table:"asset_categories",roles:["tenant_admin","asset_manager"] }, { path:"assets",table:"assets",roles:["tenant_admin","asset_manager"] },
  { path:"assets/custom-fields",table:"asset_custom_fields",roles:["tenant_admin","asset_manager"] }, { path:"assets/custom-values",table:"asset_custom_values",roles:["tenant_admin","asset_manager"] },
  { path:"assets/files",table:"asset_files",roles:["tenant_admin","asset_manager"],actorField:"created_by" },
  { path:"warranties",table:"warranties",roles:["tenant_admin","asset_manager"] }, { path:"maintenance/plans",table:"maintenance_plans",roles:["tenant_admin","maintenance_manager"] },
  { path:"maintenance/orders",table:"maintenance_orders",roles:["tenant_admin","maintenance_manager","asset_manager"] }, { path:"maintenance/costs",table:"maintenance_costs",roles:["tenant_admin","maintenance_manager"] },
  { path:"stock/categories",table:"stock_categories",roles:["tenant_admin","warehouse_manager"] }, { path:"stock/locations",table:"stock_locations",roles:["tenant_admin","warehouse_manager"] },
  { path:"stock/products",table:"stock_products",roles:["tenant_admin","warehouse_manager"] }, { path:"stock/batches",table:"stock_batches",roles:["tenant_admin","warehouse_manager"] },
  { path:"stock/requisitions",table:"stock_requisitions",roles:["tenant_admin","warehouse_manager","department_manager","employee"],actorField:"requested_by" },
  { path:"stock/requisition-items",table:"stock_requisition_items",roles:["tenant_admin","warehouse_manager","department_manager","employee"] },
  { path:"fleet/vehicles",table:"vehicles",roles:["tenant_admin","fleet_manager"] }, { path:"fleet/drivers",table:"vehicle_drivers",roles:["tenant_admin","fleet_manager"] },
  { path:"fleet/authorizations",table:"vehicle_authorizations",roles:["tenant_admin","fleet_manager"] }, { path:"fleet/documents",table:"vehicle_documents",roles:["tenant_admin","fleet_manager"] },
  { path:"fleet/reservations",table:"vehicle_reservations",roles:["tenant_admin","fleet_manager","employee"] }, { path:"fleet/fuelings",table:"vehicle_fuelings",roles:["tenant_admin","fleet_manager","employee"] },
  { path:"fleet/expenses",table:"vehicle_expenses",roles:["tenant_admin","fleet_manager"] }, { path:"fleet/fines",table:"vehicle_fines",roles:["tenant_admin","fleet_manager"] },
  { path:"fleet/incidents",table:"vehicle_incidents",roles:["tenant_admin","fleet_manager","employee"] },
  { path:"inventories",table:"inventory_campaigns",roles:["tenant_admin","asset_manager","warehouse_manager"],actorField:"created_by" },
  { path:"notification-templates",table:"notification_templates",roles:["tenant_admin"] }
];

// Leituras sensiveis a papel. Espelha as policies de 20260824000850, que o RLS
// aplica ao acesso direto mas nao alcanca a API, pois ela consulta com service role.
const scopedReads: ReadonlyArray<{ path: string; table: TenantResourceTable; managers: readonly Role[]; scope?: (userId: string) => Record<string, string>; driverScope?: boolean }> = [
  { path: "asset-movements", table: "asset_movements", managers: ["tenant_admin", "asset_manager", "maintenance_manager", "auditor"], scope: (userId) => ({ or: `(performed_by.eq.${userId},new_responsible_user_id.eq.${userId},previous_responsible_user_id.eq.${userId})` }) },
  { path: "asset-terms", table: "asset_terms", managers: ["tenant_admin", "asset_manager", "auditor"], scope: (userId) => ({ issued_to: userId }) },
  { path: "stock/movements", table: "stock_movements", managers: ["tenant_admin", "warehouse_manager", "auditor"] },
  { path: "fleet/usages", table: "vehicle_usages", managers: ["tenant_admin", "fleet_manager", "auditor"], driverScope: true },
  { path: "audit", table: "audit_logs", managers: ["tenant_admin", "auditor"] }
];

// Visoes pessoais: sempre limitadas ao proprio usuario, inclusive para gestores.
const personalReads: ReadonlyArray<{ path: string; table: TenantResourceTable; ownField: string }> = [
  { path: "my/assets", table: "assets", ownField: "responsible_user_id" },
  { path: "my/terms", table: "asset_terms", ownField: "issued_to" },
  { path: "my/requisitions", table: "stock_requisitions", ownField: "requested_by" }
];

// Recursos do CRUD cuja listagem tambem e sensivel a papel.
const readManagers: Partial<Record<BusinessTable, readonly Role[]>> = {
  assets: ["tenant_admin", "asset_manager", "maintenance_manager", "auditor"],
  stock_requisitions: ["tenant_admin", "warehouse_manager", "department_manager", "auditor"],
  stock_requisition_items: ["tenant_admin", "warehouse_manager", "department_manager", "auditor"]
};
const readOwnField: Partial<Record<BusinessTable, string>> = {
  assets: "responsible_user_id",
  stock_requisitions: "requested_by"
};

// Campos que so mudam pela operacao propria do fluxo. No cadastro inicial alguns
// deles sao legitimos (o PRD preve quilometragem e responsavel na ficha), por isso
// a lista de criacao e mais curta que a de edicao.
const protectedOnCreate: Partial<Record<BusinessTable, readonly string[]>> = {
  assets: ["internal_code", "qr_token"],
  stock_locations: ["code"],
  stock_products: ["code"],
  stock_requisitions: ["status", "approved_by", "approved_at", "delivered_at"],
  stock_requisition_items: ["delivered_quantity"],
  inventory_campaigns: ["status"]
};
const protectedOnUpdate: Partial<Record<BusinessTable, readonly string[]>> = {
  assets: ["internal_code", "status", "responsible_user_id", "qr_token"],
  stock_locations: ["code"],
  stock_products: ["code"],
  stock_requisitions: ["status", "approved_by", "approved_at", "delivered_at"],
  stock_requisition_items: ["delivered_quantity"],
  vehicles: ["status", "current_mileage"],
  inventory_campaigns: ["status"]
};

// Edicao exige papel de gestao; por padrao, o colaborador cria mas nao altera.
const updateRoles: Partial<Record<BusinessTable, readonly Role[]>> = {
  stock_requisitions: ["tenant_admin", "warehouse_manager", "department_manager"],
  stock_requisition_items: ["tenant_admin", "warehouse_manager", "department_manager"]
};

const consultaBase = z.object({
  busca: z.string().trim().max(120).optional(),
  pagina: z.coerce.number().int().min(1).max(10_000).optional(),
  tamanho: z.coerce.number().int().min(1).max(100).optional(),
  ordenar: z.string().trim().max(60).optional(),
  direcao: z.enum(["asc", "desc"]).optional()
});

/** Traduz a query string em opções de listagem, recusando o que não está liberado para a tabela. */
export function opcoesDeConsulta(query: unknown, table: TenantResourceTable): ListOptions {
  const base = consultaBase.safeParse(query ?? {});
  if (!base.success) throw new AppError("Parâmetros de consulta inválidos.", 422, "INVALID_QUERY");
  const config = consultaDe(table);
  const filtros: Record<string, string> = {};
  const recebidos = typeof query === "object" && query !== null ? (query as Record<string, unknown>) : {};

  for (const [campo, valor] of Object.entries(recebidos)) {
    if (["busca", "pagina", "tamanho", "ordenar", "direcao"].includes(campo)) continue;
    if (!config.filtraveis.includes(campo)) throw new AppError(`Filtro não permitido nesta listagem: ${campo}.`, 422, "FILTER_NOT_ALLOWED");
    if (typeof valor === "string" && valor.trim()) filtros[campo] = valor.trim();
  }
  if (base.data.ordenar && !config.ordenaveis.includes(base.data.ordenar)) {
    throw new AppError(`Ordenação não permitida nesta listagem: ${base.data.ordenar}.`, 422, "ORDER_NOT_ALLOWED");
  }
  return { ...base.data, filtros };
}

function paginado(resultado: { linhas: Record<string, unknown>[]; total: number }, opcoes: ListOptions) {
  return { data: resultado.linhas, total: resultado.total, pagina: opcoes.pagina ?? 1, tamanho: opcoes.tamanho ?? 25 };
}

function guardProtected(table: BusinessTable, payload: Record<string, unknown>, acao: "create" | "update"): void {
  const lista = acao === "create" ? protectedOnCreate[table] : protectedOnUpdate[table];
  const bloqueados = (lista ?? []).filter((field) => payload[field] !== undefined);
  if (bloqueados.length > 0) {
    throw new AppError(`Estes campos mudam apenas pela operação própria do fluxo: ${bloqueados.join(", ")}.`, 422, "PROTECTED_FIELD");
  }
}

function parse(table: keyof typeof schemas, body: unknown, partial: boolean): Record<string, unknown> {
  const base = schemas[table];
  if (!base) throw new AppError("Recurso não configurado.",500,"RESOURCE_SCHEMA_MISSING");
  const result = (partial ? base.partial() : base).safeParse(body);
  if (!result.success) throw new AppError("Dados enviados são inválidos.",422,"VALIDATION_ERROR",z.flattenError(result.error).fieldErrors as Record<string,string[]>);
  if (partial && Object.keys(result.data).length===0) throw new AppError("Informe ao menos um campo para alteração.",422,"EMPTY_UPDATE");
  return result.data;
}

export const businessRoutes: FastifyPluginAsync<BusinessRouteOptions> = async (app,{contextResolver,resourceService}) => {
  const authenticate=requireTenantContext(contextResolver);
  const contextOf=(candidate:TenantContext|null):TenantContext=>{if(!candidate)throw new AppError("Contexto ausente.",401,"TENANT_CONTEXT_REQUIRED");return candidate};
  const isManager=(context:TenantContext,roles:readonly string[]):boolean=>context.roles.some(role=>roles.includes(role));
  const restrito=():never=>{throw new AppError("Esta consulta é restrita aos perfis autorizados.",403,"PERMISSION_DENIED")};

  for(const rule of scopedReads)app.get(`/v1/${rule.path}`,{preHandler:authenticate},async request=>{
    const context=contextOf(request.tenantContext);
    const opcoes=opcoesDeConsulta(request.query,rule.table);
    if(isManager(context,rule.managers))return paginado(await resourceService.list(rule.table,context.tenantId,opcoes),opcoes);
    if(rule.scope)return paginado(await resourceService.list(rule.table,context.tenantId,{...opcoes,escopo:rule.scope(context.userId)}),opcoes);
    if(rule.driverScope){
      const motoristas=await resourceService.list("vehicle_drivers",context.tenantId,{escopo:{membership_id:context.membershipId},tamanho:1});
      const motorista=motoristas.linhas[0];
      if(typeof motorista?.id!=="string")return paginado({linhas:[],total:0},opcoes);
      return paginado(await resourceService.list(rule.table,context.tenantId,{...opcoes,escopo:{driver_id:motorista.id}}),opcoes);
    }
    return restrito();
  });

  for(const resource of personalReads)app.get(`/v1/${resource.path}`,{preHandler:authenticate},async request=>{
    const context=contextOf(request.tenantContext);
    const opcoes=opcoesDeConsulta(request.query,resource.table);
    return paginado(await resourceService.list(resource.table,context.tenantId,{...opcoes,escopo:{[resource.ownField]:context.userId}}),opcoes);
  });
  app.get("/v1/notifications",{preHandler:authenticate},async request=>{const context=contextOf(request.tenantContext);const opcoes=opcoesDeConsulta(request.query,"notifications");return paginado(await resourceService.list("notifications",context.tenantId,{...opcoes,escopo:{or:`(user_id.eq.${context.userId},user_id.is.null)`}}),opcoes)});
  app.post("/v1/notifications/:id/read",{preHandler:authenticate},async request=>{const context=request.tenantContext;const params=z.object({id:z.uuid()}).safeParse(request.params);if(!context)throw new AppError("Contexto ausente.",401,"TENANT_CONTEXT_REQUIRED");if(!params.success)throw new AppError("Identificador inválido.",422,"INVALID_IDENTIFIER");const rows=(await resourceService.list("notifications",context.tenantId,{escopo:{id:params.data.id,or:`(user_id.eq.${context.userId},user_id.is.null)`},tamanho:1})).linhas;if(!rows[0])throw new AppError("Notificação não encontrada.",404,"NOTIFICATION_NOT_FOUND");return{data:await resourceService.update("notifications",context.tenantId,context.userId,params.data.id,{read_at:new Date().toISOString()})}});
  for(const resource of resources){
    const editRoles=updateRoles[resource.table]??resource.roles.filter(role=>role!=="employee");
    app.get(`/v1/${resource.path}`,{preHandler:authenticate},async(request)=>{
      const context=contextOf(request.tenantContext);
      const opcoes=opcoesDeConsulta(request.query,resource.table);
      const managers=readManagers[resource.table];
      if(!managers||isManager(context,managers))return paginado(await resourceService.list(resource.table,context.tenantId,opcoes),opcoes);
      const ownField=readOwnField[resource.table];
      if(!ownField)return restrito();
      return paginado(await resourceService.list(resource.table,context.tenantId,{...opcoes,escopo:{[ownField]:context.userId}}),opcoes);
    });
    app.get(`/v1/${resource.path}/:id`,{preHandler:authenticate},async(request)=>{
      const context=contextOf(request.tenantContext);
      const params=z.object({id:z.uuid()}).safeParse(request.params);
      if(!params.success)throw new AppError("Identificador inválido.",422,"INVALID_IDENTIFIER");
      const managers=readManagers[resource.table];
      if(managers&&!isManager(context,managers)&&!readOwnField[resource.table])return restrito();
      const escopo=!managers||isManager(context,managers)
        ? {id:params.data.id}
        : {id:params.data.id,[readOwnField[resource.table] as string]:context.userId};
      const resultado=await resourceService.list(resource.table,context.tenantId,{escopo,tamanho:1});
      const registro=resultado.linhas[0];
      if(!registro)throw new AppError("Registro não encontrado.",404,"RESOURCE_NOT_FOUND");
      return {data:registro};
    });
    app.post(`/v1/${resource.path}`,{preHandler:[authenticate,requireTenantRole(resource.roles)]},async(request,reply)=>{
      const context=contextOf(request.tenantContext);
      const payload=parse(resource.table,request.body,false);
      guardProtected(resource.table,payload,"create");
      if(resource.actorField) payload[resource.actorField]=context.userId;
      const data=await resourceService.create(resource.table,context.tenantId,context.userId,payload);
      return reply.status(201).send({data});
    });
    app.patch(`/v1/${resource.path}/:id`,{preHandler:[authenticate,requireTenantRole(editRoles)]},async(request)=>{
      const context=contextOf(request.tenantContext);
      const params=z.object({id:z.uuid()}).safeParse(request.params);
      if(!params.success) throw new AppError("Identificador inválido.",422,"INVALID_IDENTIFIER");
      const payload=parse(resource.table,request.body,true);
      guardProtected(resource.table,payload,"update");
      return {data:await resourceService.update(resource.table,context.tenantId,context.userId,params.data.id,payload)};
    });
  }
};
