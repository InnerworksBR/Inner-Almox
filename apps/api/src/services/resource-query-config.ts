import type { TenantResourceTable } from "./tenant-resource-service";

/**
 * Configuracao de consulta por tabela. Fica no backend de proposito: o cliente
 * escolhe pagina, termo de busca e ordenacao, mas nunca quais campos podem ser
 * lidos, pesquisados ou filtrados.
 */
export interface ConsultaTabela {
  /** Campos devolvidos, incluindo os relacionamentos que substituem UUID por nome. */
  select: string;
  pesquisaveis: readonly string[];
  ordenaveis: readonly string[];
  filtraveis: readonly string[];
  ordemPadrao: string;
}

const PADRAO: ConsultaTabela = {
  select: "*",
  pesquisaveis: [],
  ordenaveis: ["created_at"],
  filtraveis: [],
  ordemPadrao: "created_at.desc"
};

const comuns = ["created_at", "updated_at"] as const;

const configuracoes: Partial<Record<TenantResourceTable, Partial<ConsultaTabela>>> = {
  branches: { pesquisaveis: ["code", "name", "legal_name", "tax_id", "email"], ordenaveis: ["code", "name", "status", ...comuns], filtraveis: ["status"] },
  departments: { select: "*,branches(name),cost_centers(name)", pesquisaveis: ["code", "name"], ordenaveis: ["code", "name", "status", ...comuns], filtraveis: ["status", "branch_id"] },
  cost_centers: { pesquisaveis: ["code", "name", "description"], ordenaveis: ["code", "name", "status", ...comuns], filtraveis: ["status"] },
  locations: { select: "*,branches(name)", pesquisaveis: ["code", "name", "path"], ordenaveis: ["code", "name", "type", "status", ...comuns], filtraveis: ["status", "type", "branch_id"] },
  suppliers: { pesquisaveis: ["legal_name", "trade_name", "tax_id", "email", "contact_name"], ordenaveis: ["legal_name", "trade_name", "status", ...comuns], filtraveis: ["status"] },

  asset_categories: { pesquisaveis: ["name", "description"], ordenaveis: ["name", "status", ...comuns], filtraveis: ["status"] },
  assets: {
    select: "*,asset_categories(name),branches(name),locations(name),departments(name),cost_centers(name),suppliers(legal_name,trade_name),profiles(full_name)",
    pesquisaveis: ["internal_code", "asset_number", "serial_number", "description", "brand", "model", "invoice_number"],
    ordenaveis: ["internal_code", "asset_number", "description", "status", "condition", "purchase_value", "purchase_date", ...comuns],
    filtraveis: ["status", "condition", "category_id", "branch_id", "location_id", "department_id", "responsible_user_id"]
  },
  asset_files: { select: "*,assets(internal_code,description)", pesquisaveis: ["name", "kind"], ordenaveis: ["name", "kind", "created_at"], filtraveis: ["kind", "asset_id"] },
  asset_movements: {
    select: "*,assets(internal_code,description),responsavel:profiles!asset_movements_new_responsible_user_id_fkey(full_name),executor:profiles!asset_movements_performed_by_fkey(full_name)",
    pesquisaveis: ["reason"],
    ordenaveis: ["occurred_at", "type", "created_at"],
    filtraveis: ["type", "asset_id"],
    ordemPadrao: "occurred_at.desc"
  },
  asset_terms: {
    select: "*,assets(internal_code,description),profiles!asset_terms_issued_to_fkey(full_name)",
    pesquisaveis: ["validation_code", "type"],
    ordenaveis: ["created_at", "type", "accepted_at"],
    filtraveis: ["type", "asset_id"]
  },
  warranties: { select: "*,assets(internal_code,description),suppliers(legal_name)", pesquisaveis: ["type", "provider", "coverage"], ordenaveis: ["ends_at", "starts_at", "type", "status", ...comuns], filtraveis: ["status", "asset_id"], ordemPadrao: "ends_at.asc" },
  maintenance_plans: { select: "*,assets(internal_code,description)", pesquisaveis: ["name", "instructions"], ordenaveis: ["name", "next_due_at", "criterion", ...comuns], filtraveis: ["criterion", "asset_id"] },
  maintenance_orders: {
    select: "*,assets(internal_code,description),suppliers(legal_name)",
    pesquisaveis: ["number", "reported_problem", "diagnosis", "solution"],
    ordenaveis: ["number", "opened_at", "expected_at", "status", "priority", "type", ...comuns],
    filtraveis: ["status", "type", "priority", "asset_id"],
    ordemPadrao: "opened_at.desc"
  },
  maintenance_costs: { select: "*,maintenance_orders(number)", pesquisaveis: ["description", "category"], ordenaveis: ["occurred_at", "amount", "created_at"], filtraveis: ["order_id"] },

  stock_categories: { pesquisaveis: ["name"], ordenaveis: ["name", "status", ...comuns], filtraveis: ["status"] },
  stock_locations: { select: "*,locations(name)", pesquisaveis: ["name", "code"], ordenaveis: ["name", "code", "status", ...comuns], filtraveis: ["status"] },
  stock_products: {
    select: "*,stock_categories(name),suppliers(legal_name),stock_balances(quantity)",
    pesquisaveis: ["code", "sku", "name", "brand", "manufacturer", "barcode"],
    ordenaveis: ["code", "name", "unit", "minimum_stock", "status", ...comuns],
    filtraveis: ["status", "category_id"]
  },
  stock_batches: { select: "*,stock_products(name,code),stock_locations(name)", pesquisaveis: ["number"], ordenaveis: ["number", "expires_at", "received_at", ...comuns], filtraveis: ["product_id", "stock_location_id"], ordemPadrao: "expires_at.asc" },
  stock_movements: {
    select: "*,stock_products(name,code),stock_locations(name),departments(name),executor:profiles!stock_movements_performed_by_fkey(full_name)",
    pesquisaveis: ["document_number", "reason"],
    ordenaveis: ["occurred_at", "type", "quantity", "created_at"],
    filtraveis: ["type", "product_id", "stock_location_id"],
    ordemPadrao: "occurred_at.desc"
  },
  stock_requisitions: {
    select: "*,departments(name),cost_centers(name),solicitante:profiles!stock_requisitions_requested_by_fkey(full_name),stock_requisition_items(id)",
    pesquisaveis: ["number", "purpose"],
    ordenaveis: ["number", "status", ...comuns],
    filtraveis: ["status", "department_id"]
  },
  stock_requisition_items: { select: "*,stock_products(name,code),stock_requisitions(number)", pesquisaveis: ["notes"], ordenaveis: ["created_at"], filtraveis: ["requisition_id", "product_id"] },

  vehicles: { select: "*,branches(name),cost_centers(name)", pesquisaveis: ["plate", "brand", "model", "renavam", "chassis", "policy_number"], ordenaveis: ["plate", "brand", "model", "status", "current_mileage", ...comuns], filtraveis: ["status", "branch_id"] },
  vehicle_drivers: { select: "*,tenant_memberships(employee_number,position,profiles(full_name))", pesquisaveis: ["license_number", "category"], ordenaveis: ["expires_at", "category", "status", ...comuns], filtraveis: ["status"], ordemPadrao: "expires_at.asc" },
  vehicle_authorizations: { select: "*,vehicles(plate,model),vehicle_drivers(license_number)", pesquisaveis: ["vehicle_type"], ordenaveis: ["valid_from", "valid_until", ...comuns], filtraveis: ["driver_id", "vehicle_id"] },
  vehicle_reservations: { select: "*,vehicles(plate,model),vehicle_drivers(license_number)", pesquisaveis: ["destination", "purpose"], ordenaveis: ["starts_at", "ends_at", "status", ...comuns], filtraveis: ["status", "vehicle_id"], ordemPadrao: "starts_at.desc" },
  vehicle_usages: {
    select: "*,vehicles(plate,model),vehicle_drivers(license_number,tenant_memberships(profiles(full_name)))",
    pesquisaveis: ["destination", "purpose", "damages", "notes"],
    ordenaveis: ["checked_out_at", "returned_at", "status", ...comuns],
    filtraveis: ["status", "vehicle_id", "driver_id"],
    ordemPadrao: "checked_out_at.desc"
  },
  vehicle_checklists: { select: "*,vehicle_usages(destination)", pesquisaveis: ["notes"], ordenaveis: ["completed_at"], filtraveis: ["phase", "usage_id"], ordemPadrao: "completed_at.desc" },
  vehicle_fuelings: { select: "*,vehicles(plate,model)", pesquisaveis: ["station", "fuel_type"], ordenaveis: ["occurred_at", "total_amount", "liters", "mileage", "created_at"], filtraveis: ["vehicle_id"], ordemPadrao: "occurred_at.desc" },
  vehicle_expenses: { select: "*,vehicles(plate,model),suppliers(legal_name)", pesquisaveis: ["description", "type"], ordenaveis: ["occurred_at", "amount", "type", "created_at"], filtraveis: ["type", "vehicle_id"], ordemPadrao: "occurred_at.desc" },
  vehicle_fines: { select: "*,vehicles(plate,model)", pesquisaveis: ["type", "location", "payment_responsible"], ordenaveis: ["occurred_at", "due_at", "amount", "status", ...comuns], filtraveis: ["status", "vehicle_id"], ordemPadrao: "occurred_at.desc" },
  vehicle_incidents: { select: "*,vehicles(plate,model)", pesquisaveis: ["description", "location", "type"], ordenaveis: ["occurred_at", "type", "status", ...comuns], filtraveis: ["status", "type", "vehicle_id"], ordemPadrao: "occurred_at.desc" },
  vehicle_documents: { select: "*,vehicles(plate,model)", pesquisaveis: ["type", "number"], ordenaveis: ["expires_at", "issued_at", "type", "status", ...comuns], filtraveis: ["status", "vehicle_id"], ordemPadrao: "expires_at.asc" },

  inventory_campaigns: { pesquisaveis: ["name"], ordenaveis: ["name", "starts_at", "ends_at", "status", "type", ...comuns], filtraveis: ["status", "type"], ordemPadrao: "starts_at.desc" },
  inventory_items: { select: "*,assets(internal_code,description),stock_products(name,code)", pesquisaveis: ["notes"], ordenaveis: ["scanned_at", "result", ...comuns], filtraveis: ["result", "campaign_id"] },

  notifications: { pesquisaveis: ["title", "message", "type"], ordenaveis: ["created_at", "type", "read_at"], filtraveis: ["type", "channel"] },
  notification_templates: { pesquisaveis: ["event_key", "subject", "body"], ordenaveis: ["event_key", "channel", ...comuns], filtraveis: ["channel", "enabled"] },
  audit_logs: { select: "*,profiles(full_name)", pesquisaveis: ["action", "entity_type", "entity_id"], ordenaveis: ["created_at", "action", "entity_type"], filtraveis: ["action", "entity_type"] }
};

export function consultaDe(tabela: TenantResourceTable): ConsultaTabela {
  return { ...PADRAO, ...(configuracoes[tabela] ?? {}) };
}
