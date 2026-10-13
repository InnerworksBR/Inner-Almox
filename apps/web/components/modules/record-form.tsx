"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";

import { RelationSelect } from "@/components/modules/relation-select";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { apiEndpointByModule } from "@/lib/module-catalog";

interface FieldDefinition {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "datetime-local" | "textarea" | "select";
  required?: boolean;
  /** Endpoint que alimenta o seletor de vínculo. */
  source?: string;
  valueKey?: string;
  labelKeys?: readonly string[];
  /** Campos longos ocupam a linha inteira. */
  largura?: "cheia";
  options?: readonly { value: string; label: string }[];
}

// Fontes reaproveitadas pelos vínculos mais comuns.
const filial = { source: "branches", labelKeys: ["name", "code"] } as const;
const setor = { source: "departments", labelKeys: ["name", "code"] } as const;
const centro = { source: "cost-centers", labelKeys: ["name", "code"] } as const;
const localizacao = { source: "locations", labelKeys: ["name", "code"] } as const;
const fornecedor = { source: "suppliers", labelKeys: ["legal_name", "trade_name"] } as const;
const pessoa = { source: "users", valueKey: "user_id", labelKeys: ["full_name", "email"] } as const;
const ativo = { source: "assets", labelKeys: ["description", "internal_code"] } as const;
const produto = { source: "stock/products", labelKeys: ["name", "code"] } as const;
const estoque = { source: "stock/locations", labelKeys: ["name", "code"] } as const;
const veiculo = { source: "fleet/vehicles", labelKeys: ["plate", "model"] } as const;
const motorista = { source: "fleet/drivers", labelKeys: ["tenant_memberships.profiles.full_name", "license_number"] } as const;

const commonOrganization: FieldDefinition[] = [
  { name: "name", label: "Nome", placeholder: "Nome de exibição", required: true }
];

const automaticCodePaths = new Set([
  "admin/filiais",
  "admin/setores",
  "admin/centros-de-custo",
  "admin/localizacoes",
  "almoxarifado/produtos",
  "almoxarifado/estoques"
]);

const fieldsByPath: Record<string, FieldDefinition[]> = {
  "superadmin/tenants": [
    { name: "slug", label: "Slug", placeholder: "cliente-exemplo", required: true },
    { name: "legal_name", label: "Razão social", placeholder: "Cliente Exemplo Ltda.", required: true },
    { name: "product_name", label: "Nome do produto", placeholder: "Almox Cliente", required: true },
    { name: "hostname", label: "Domínio", placeholder: "almox.cliente.com.br", required: true },
    { name: "plan", label: "Plano", placeholder: "starter", required: true },
    { name: "user_limit", label: "Limite de usuários", type: "number" },
    { name: "asset_limit", label: "Limite de ativos", type: "number" },
    { name: "vehicle_limit", label: "Limite de veículos", type: "number" }
  ],
  "superadmin/dominios": [
    { name: "tenant_id", label: "Tenant", placeholder: "Selecione o tenant", required: true, source: "platform/tenants", labelKeys: ["legal_name", "slug"] },
    { name: "hostname", label: "Domínio", placeholder: "almox.cliente.com.br", required: true }
  ],
  "superadmin/planos": [
    { name: "code", label: "Código", placeholder: "business", required: true },
    { name: "name", label: "Nome", placeholder: "Business", required: true },
    { name: "description", label: "Descrição", placeholder: "Descrição comercial", largura: "cheia" },
    { name: "user_limit", label: "Limite de usuários", type: "number" },
    { name: "asset_limit", label: "Limite de ativos", type: "number" },
    { name: "vehicle_limit", label: "Limite de veículos", type: "number" }
  ],
  "admin/filiais": [
    ...commonOrganization,
    { name: "legal_name", label: "Razão social", placeholder: "Razão social" },
    { name: "tax_id", label: "CNPJ", placeholder: "00.000.000/0000-00" },
    { name: "email", label: "E-mail", type: "email", placeholder: "contato@empresa.com" },
    { name: "phone", label: "Telefone", type: "tel", placeholder: "(11) 00000-0000" },
    { name: "manager_user_id", label: "Responsável", placeholder: "Selecione o responsável", ...pessoa }
  ],
  "admin/setores": [
    ...commonOrganization,
    { name: "branch_id", label: "Filial", placeholder: "Selecione a filial", ...filial },
    { name: "parent_id", label: "Setor superior", placeholder: "Selecione se houver", ...setor },
    { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione o centro", ...centro },
    { name: "manager_user_id", label: "Gestor", placeholder: "Selecione o gestor", ...pessoa }
  ],
  "admin/centros-de-custo": [
    ...commonOrganization,
    { name: "description", label: "Descrição", placeholder: "Finalidade do centro", largura: "cheia" },
    { name: "manager_user_id", label: "Responsável", placeholder: "Selecione o responsável", ...pessoa }
  ],
  "admin/localizacoes": [
    ...commonOrganization,
    { name: "branch_id", label: "Filial", placeholder: "Selecione a filial", ...filial },
    { name: "parent_id", label: "Local superior", placeholder: "Selecione se houver", ...localizacao },
    {
      name: "type",
      label: "Tipo",
      required: true,
      type: "select",
      options: [
        { value: "building", label: "Prédio" },
        { value: "floor", label: "Andar" },
        { value: "room", label: "Sala" },
        { value: "warehouse", label: "Almoxarifado" },
        { value: "stock", label: "Estoque" },
        { value: "garage", label: "Garagem" },
        { value: "other", label: "Outro" }
      ]
    }
  ],
  "admin/fornecedores": [
    { name: "legal_name", label: "Razão social", placeholder: "Empresa fornecedora", required: true },
    { name: "trade_name", label: "Nome fantasia", placeholder: "Nome comercial" },
    { name: "tax_id", label: "Documento", placeholder: "CNPJ / CPF" },
    { name: "email", label: "E-mail", type: "email", placeholder: "contato@fornecedor.com" },
    { name: "phone", label: "Telefone", type: "tel", placeholder: "(11) 00000-0000" },
    { name: "contact_name", label: "Contato", placeholder: "Nome do contato" }
  ],
  "admin/usuarios": [
    { name: "full_name", label: "Nome completo", placeholder: "Nome do colaborador", required: true },
    { name: "email", label: "E-mail", type: "email", placeholder: "colaborador@empresa.com", required: true },
    { name: "employee_number", label: "Matrícula", placeholder: "Matrícula interna" },
    { name: "position", label: "Cargo", placeholder: "Cargo do colaborador" },
    { name: "role", label: "Perfil", placeholder: "employee", required: true },
    { name: "branch_id", label: "Filial", placeholder: "Selecione a filial", ...filial },
    { name: "department_id", label: "Setor", placeholder: "Selecione o setor", ...setor },
    { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione o centro", ...centro }
  ],
  "patrimonio/categorias": [
    { name: "name", label: "Nome", placeholder: "Notebooks", required: true },
    { name: "parent_id", label: "Categoria superior", placeholder: "Selecione se houver", source: "asset-categories", labelKeys: ["name"] },
    { name: "description", label: "Descrição", placeholder: "Descrição da categoria", largura: "cheia" }
  ],
  "patrimonio/ativos": [
    { name: "asset_number", label: "Número patrimonial", placeholder: "PAT-2026-001" },
    { name: "description", label: "Descrição", placeholder: "Notebook Dell Latitude", required: true, largura: "cheia" },
    { name: "category_id", label: "Categoria", placeholder: "Selecione a categoria", source: "asset-categories", labelKeys: ["name"] },
    { name: "serial_number", label: "Número de série", placeholder: "Número de série" },
    { name: "brand", label: "Marca", placeholder: "Fabricante" },
    { name: "model", label: "Modelo", placeholder: "Modelo" },
    { name: "branch_id", label: "Filial", placeholder: "Selecione a filial", ...filial },
    { name: "location_id", label: "Localização", placeholder: "Selecione a localização", ...localizacao },
    { name: "department_id", label: "Setor", placeholder: "Selecione o setor", ...setor },
    { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione o centro", ...centro },
    { name: "responsible_user_id", label: "Responsável", placeholder: "Selecione o responsável", ...pessoa },
    { name: "supplier_id", label: "Fornecedor", placeholder: "Selecione o fornecedor", ...fornecedor },
    { name: "purchase_value", label: "Valor de compra", type: "number", placeholder: "0,00" },
    { name: "purchase_date", label: "Data de compra", type: "date" },
    { name: "invoice_number", label: "Nota fiscal", placeholder: "Número da nota" },
    { name: "notes", label: "Observações", type: "textarea", placeholder: "Detalhes adicionais", largura: "cheia" }
  ],
  "patrimonio/movimentacoes": [
    { name: "target_asset_id", label: "Ativo", placeholder: "Selecione o ativo", required: true, ...ativo },
    { name: "movement_type", label: "Tipo", placeholder: "delivery, return, loan…", required: true },
    { name: "new_responsible_id", label: "Novo responsável", placeholder: "Selecione se houver", ...pessoa },
    { name: "new_condition_value", label: "Condição", placeholder: "new, good, fair, poor ou damaged" },
    { name: "movement_reason", label: "Motivo", placeholder: "Motivo da movimentação", largura: "cheia" }
  ],
  "patrimonio/garantias": [
    { name: "asset_id", label: "Ativo", placeholder: "Selecione o ativo", required: true, ...ativo },
    { name: "type", label: "Tipo", placeholder: "Fabricante", required: true },
    { name: "supplier_id", label: "Fornecedor", placeholder: "Selecione o fornecedor", ...fornecedor },
    { name: "provider", label: "Prestador", placeholder: "Empresa responsável" },
    { name: "starts_at", label: "Início", type: "date" },
    { name: "ends_at", label: "Vencimento", type: "date", required: true },
    { name: "coverage", label: "Cobertura", placeholder: "Itens cobertos", largura: "cheia" },
    { name: "notes", label: "Observações", type: "textarea", placeholder: "Detalhes adicionais", largura: "cheia" }
  ],
  "patrimonio/manutencoes": [
    { name: "number", label: "Número da OS", placeholder: "OS-0001", required: true },
    { name: "asset_id", label: "Ativo", placeholder: "Selecione o ativo", required: true, ...ativo },
    { name: "type", label: "Tipo", placeholder: "preventive ou corrective", required: true },
    { name: "priority", label: "Prioridade", placeholder: "normal" },
    { name: "plan_id", label: "Plano preventivo", placeholder: "Selecione se houver", source: "maintenance/plans", labelKeys: ["name"] },
    { name: "supplier_id", label: "Fornecedor", placeholder: "Selecione o fornecedor", ...fornecedor },
    { name: "expected_at", label: "Previsão", type: "datetime-local" },
    { name: "reported_problem", label: "Problema relatado", placeholder: "Descreva o problema", required: true, type: "textarea", largura: "cheia" }
  ],
  "patrimonio/inventarios": [
    { name: "name", label: "Campanha", placeholder: "Inventário anual", required: true },
    { name: "type", label: "Tipo", placeholder: "assets", required: true },
    { name: "starts_at", label: "Início", type: "date", required: true },
    { name: "ends_at", label: "Fim", type: "date", required: true }
  ],
  "almoxarifado/produtos": [
    { name: "sku", label: "SKU", placeholder: "SKU-001" },
    { name: "name", label: "Nome", placeholder: "Nome do produto", required: true, largura: "cheia" },
    { name: "category_id", label: "Categoria", placeholder: "Selecione a categoria", source: "stock/categories", labelKeys: ["name"] },
    { name: "preferred_supplier_id", label: "Fornecedor preferencial", placeholder: "Selecione o fornecedor", ...fornecedor },
    { name: "unit", label: "Unidade", placeholder: "UN", required: true },
    { name: "minimum_stock", label: "Estoque mínimo", type: "number", placeholder: "0" },
    { name: "maximum_stock", label: "Estoque máximo", type: "number", placeholder: "0" },
    { name: "barcode", label: "Código de barras", placeholder: "EAN / GTIN" },
    { name: "brand", label: "Marca", placeholder: "Fabricante" }
  ],
  "almoxarifado/estoques": [
    { name: "location_id", label: "Localização", placeholder: "Selecione a localização", required: true, ...localizacao },
    { name: "name", label: "Nome do estoque", placeholder: "Almoxarifado central", required: true },
  ],
  "almoxarifado/entradas": [
    { name: "target_product_id", label: "Produto", placeholder: "Selecione o produto", required: true, ...produto },
    { name: "target_stock_location_id", label: "Estoque", placeholder: "Selecione o estoque", required: true, ...estoque },
    { name: "movement_quantity", label: "Quantidade", type: "number", required: true },
    { name: "movement_unit_cost", label: "Custo unitário", type: "number" },
    { name: "movement_document", label: "Documento", placeholder: "NF / referência" },
    { name: "movement_reason", label: "Motivo", placeholder: "Compra, devolução ou ajuste", largura: "cheia" }
  ],
  "almoxarifado/saidas": [
    { name: "target_product_id", label: "Produto", placeholder: "Selecione o produto", required: true, ...produto },
    { name: "target_stock_location_id", label: "Estoque", placeholder: "Selecione o estoque", required: true, ...estoque },
    { name: "movement_quantity", label: "Quantidade", type: "number", required: true },
    { name: "target_department_id", label: "Setor de destino", placeholder: "Selecione se houver", ...setor },
    { name: "target_cost_center_id", label: "Centro de custo", placeholder: "Selecione se houver", ...centro },
    { name: "movement_reason", label: "Motivo", placeholder: "Consumo, perda ou ajuste", largura: "cheia" }
  ],
  "almoxarifado/transferencias": [
    { name: "target_product_id", label: "Produto", placeholder: "Selecione o produto", required: true, ...produto },
    { name: "source_stock_location_id", label: "Estoque de origem", placeholder: "Selecione a origem", required: true, ...estoque },
    { name: "destination_stock_location_id", label: "Estoque de destino", placeholder: "Selecione o destino", required: true, ...estoque },
    { name: "movement_quantity", label: "Quantidade", type: "number", required: true },
    { name: "movement_reason", label: "Motivo", placeholder: "Motivo da transferência", largura: "cheia" }
  ],
  "almoxarifado/lotes": [
    { name: "product_id", label: "Produto", placeholder: "Selecione o produto", required: true, ...produto },
    { name: "stock_location_id", label: "Estoque", placeholder: "Selecione o estoque", required: true, ...estoque },
    { name: "supplier_id", label: "Fornecedor", placeholder: "Selecione o fornecedor", ...fornecedor },
    { name: "number", label: "Número do lote", placeholder: "LOTE-001", required: true },
    { name: "received_at", label: "Entrada", type: "date" },
    { name: "expires_at", label: "Validade", type: "date" },
    { name: "unit_cost", label: "Custo unitário", type: "number" }
  ],
  "almoxarifado/requisicoes": [
    { name: "number", label: "Número", placeholder: "REQ-0001", required: true },
    { name: "purpose", label: "Finalidade", placeholder: "Uso do material", required: true, largura: "cheia" },
    { name: "product_id", label: "Produto", placeholder: "Selecione o produto", required: true, ...produto },
    { name: "quantity", label: "Quantidade", type: "number", required: true },
    { name: "department_id", label: "Setor", placeholder: "Selecione se houver", ...setor },
    { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione se houver", ...centro }
  ],
  "solicitar-material": [
    { name: "number", label: "Número", placeholder: "REQ-0001", required: true },
    { name: "purpose", label: "Finalidade", placeholder: "Uso do material", required: true, largura: "cheia" },
    { name: "product_id", label: "Produto", placeholder: "Selecione o produto", required: true, ...produto },
    { name: "quantity", label: "Quantidade", type: "number", required: true }
  ],
  "almoxarifado/inventarios": [
    { name: "name", label: "Campanha", placeholder: "Inventário do estoque", required: true },
    { name: "type", label: "Tipo", placeholder: "stock", required: true },
    { name: "starts_at", label: "Início", type: "date", required: true },
    { name: "ends_at", label: "Fim", type: "date", required: true }
  ],
  "frota/veiculos": [
    { name: "plate", label: "Placa", placeholder: "ABC1D23", required: true },
    { name: "brand", label: "Marca", placeholder: "Fabricante", required: true },
    { name: "model", label: "Modelo", placeholder: "Modelo", required: true },
    { name: "branch_id", label: "Filial", placeholder: "Selecione a filial", ...filial },
    { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione o centro", ...centro },
    { name: "renavam", label: "Renavam", placeholder: "Número do Renavam" },
    { name: "chassis", label: "Chassi", placeholder: "Número do chassi" },
    { name: "model_year", label: "Ano", type: "number", placeholder: "2026" },
    { name: "color", label: "Cor", placeholder: "Cor" },
    { name: "current_mileage", label: "Quilometragem", type: "number", placeholder: "0" }
  ],
  "frota/motoristas": [
    { name: "membership_id", label: "Colaborador", placeholder: "Selecione o colaborador", required: true, source: "users", valueKey: "membership_id", labelKeys: ["full_name", "email"] },
    { name: "license_number", label: "CNH", placeholder: "Número da CNH", required: true },
    { name: "category", label: "Categoria", placeholder: "B", required: true },
    { name: "expires_at", label: "Validade", type: "date", required: true }
  ],
  "frota/autorizacoes": [
    { name: "driver_id", label: "Motorista", placeholder: "Selecione o motorista", required: true, source: "fleet/drivers", labelKeys: ["license_number", "tenant_memberships.profiles.full_name"] },
    { name: "vehicle_id", label: "Veículo", placeholder: "Selecione o veículo", source: "fleet/vehicles", labelKeys: ["plate", "model"] },
    { name: "vehicle_type", label: "Tipo de veículo", placeholder: "Qualquer veículo compatível" },
    { name: "valid_from", label: "Início", type: "date" },
    { name: "valid_until", label: "Vencimento", type: "date" }
  ],
  "frota/reservas": [
    { name: "vehicle_id", label: "Veículo", placeholder: "Selecione o veículo", required: true, ...veiculo },
    { name: "driver_id", label: "Motorista", placeholder: "Selecione o motorista", required: true, ...motorista },
    { name: "starts_at", label: "Início", type: "datetime-local", required: true },
    { name: "ends_at", label: "Fim", type: "datetime-local", required: true },
    { name: "destination", label: "Destino", placeholder: "Destino" },
    { name: "purpose", label: "Finalidade", placeholder: "Finalidade", required: true }
  ],
  "frota/retiradas": [
    { name: "target_vehicle_id", label: "Veículo", placeholder: "Selecione o veículo", required: true, ...veiculo },
    { name: "target_driver_id", label: "Motorista", placeholder: "Selecione o motorista", required: true, ...motorista },
    { name: "initial_mileage_value", label: "Quilometragem inicial", type: "number", required: true },
    { name: "destination_value", label: "Destino", placeholder: "Destino", required: true },
    { name: "purpose_value", label: "Finalidade", placeholder: "Finalidade", required: true },
    { name: "fuel_level_value", label: "Combustível (%)", type: "number" }
  ],
  "frota/devolucoes": [
    { name: "target_usage_id", label: "Retirada em aberto", placeholder: "Selecione a retirada", required: true, source: "fleet/usages", labelKeys: ["vehicles.plate", "destination"] },
    { name: "final_mileage_value", label: "Quilometragem final", type: "number", required: true },
    { name: "fuel_level_value", label: "Combustível (%)", type: "number" },
    { name: "damages_value", label: "Avarias", placeholder: "Avarias identificadas", largura: "cheia" },
    { name: "notes_value", label: "Observações", type: "textarea", placeholder: "Observações da devolução", largura: "cheia" }
  ],
  "frota/abastecimentos": [
    { name: "vehicle_id", label: "Veículo", placeholder: "Selecione o veículo", required: true, ...veiculo },
    { name: "driver_id", label: "Motorista", placeholder: "Selecione se houver", ...motorista },
    { name: "occurred_at", label: "Data", type: "datetime-local", required: true },
    { name: "fuel_type", label: "Combustível", placeholder: "Gasolina", required: true },
    { name: "station", label: "Posto", placeholder: "Nome do posto" },
    { name: "liters", label: "Litros", type: "number", required: true },
    { name: "unit_price", label: "Preço por litro", type: "number", required: true },
    { name: "total_amount", label: "Valor total", type: "number", required: true },
    { name: "mileage", label: "Quilometragem", type: "number", required: true },
    { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione se houver", ...centro }
  ],
  "frota/despesas": [
    { name: "vehicle_id", label: "Veículo", placeholder: "Selecione o veículo", required: true, ...veiculo },
    { name: "type", label: "Tipo", placeholder: "toll, parking, maintenance…", required: true },
    { name: "description", label: "Descrição", placeholder: "Descrição", required: true, largura: "cheia" },
    { name: "amount", label: "Valor", type: "number", required: true },
    { name: "occurred_at", label: "Data", type: "date", required: true },
    { name: "supplier_id", label: "Fornecedor", placeholder: "Selecione se houver", ...fornecedor },
    { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione se houver", ...centro }
  ],
  "frota/multas": [
    { name: "vehicle_id", label: "Veículo", placeholder: "Selecione o veículo", required: true, ...veiculo },
    { name: "driver_id", label: "Condutor", placeholder: "Selecione se houver", ...motorista },
    { name: "type", label: "Infração", placeholder: "Tipo da infração", required: true },
    { name: "occurred_at", label: "Data", type: "datetime-local", required: true },
    { name: "amount", label: "Valor", type: "number", required: true },
    { name: "points", label: "Pontos", type: "number" },
    { name: "due_at", label: "Vencimento", type: "date" },
    { name: "notes", label: "Observações", type: "textarea", placeholder: "Detalhes da multa", largura: "cheia" }
  ],
  "frota/ocorrencias": [
    { name: "vehicle_id", label: "Veículo", placeholder: "Selecione o veículo", required: true, ...veiculo },
    { name: "driver_id", label: "Condutor", placeholder: "Selecione se houver", ...motorista },
    { name: "type", label: "Tipo", placeholder: "accident, damage, breakdown…", required: true },
    { name: "occurred_at", label: "Data", type: "datetime-local", required: true },
    { name: "location", label: "Local", placeholder: "Local da ocorrência" },
    { name: "description", label: "Descrição", placeholder: "Relato da ocorrência", required: true, type: "textarea", largura: "cheia" }
  ]
};

const campoGenerico: FieldDefinition[] = [{ name: "name", label: "Nome", placeholder: "Nome do registro", required: true }];

function camposInvalidos(corpo: unknown): Record<string, string[]> {
  if (typeof corpo !== "object" || corpo === null || !("error" in corpo)) return {};
  const erro = corpo.error;
  if (typeof erro !== "object" || erro === null || !("fields" in erro) || typeof erro.fields !== "object" || erro.fields === null) return {};
  return erro.fields as Record<string, string[]>;
}

function mensagemDe(corpo: unknown, padrao: string): string {
  if (typeof corpo !== "object" || corpo === null || !("error" in corpo)) return padrao;
  const erro = corpo.error;
  return typeof erro === "object" && erro !== null && "message" in erro && typeof erro.message === "string" ? erro.message : padrao;
}

type Registro = Record<string, unknown>;

function textoDoRegistro(record: Registro | undefined, campo: string): string {
  const valor = record?.[campo];
  return typeof valor === "string" || typeof valor === "number" ? String(valor) : "";
}

function valorInicial(record: Registro | undefined, campo: string): string | number | undefined {
  const valor = record?.[campo];
  return typeof valor === "string" || typeof valor === "number" ? valor : undefined;
}

export function normalizarValorDoCampo(tipo: FieldDefinition["type"], valor: string): string | number {
  if (tipo !== "datetime-local") return valor;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toISOString();
}

const relacoesPorCampo: Record<string, { registro: string; campos: string[] }> = {
  category_id: { registro: "asset_categories", campos: ["name"] },
  branch_id: { registro: "branches", campos: ["name", "code"] },
  location_id: { registro: "locations", campos: ["name", "code"] },
  department_id: { registro: "departments", campos: ["name", "code"] },
  cost_center_id: { registro: "cost_centers", campos: ["name", "code"] },
  responsible_user_id: { registro: "profiles", campos: ["full_name", "email"] },
  supplier_id: { registro: "suppliers", campos: ["trade_name", "legal_name"] }
};

function rotuloDaRelacao(record: Registro | undefined, campo: string): string {
  const relacao = relacoesPorCampo[campo];
  if (!relacao) return "";
  const valor = relacao ? record?.[relacao.registro] : undefined;
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return "";
  const objeto = valor as Record<string, unknown>;
  for (const chave of relacao.campos) {
    const texto = objeto[chave];
    if (typeof texto === "string" && texto.trim()) return texto;
  }
  return "";
}

export function RecordForm({ title, description, singular, path, mode = "create", record }: { title: string; description: string; singular: string; path: string; mode?: "create" | "edit"; record?: Registro }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string[]>>({});
  const fields = fieldsByPath[path] ?? campoGenerico;
  const editando = mode === "edit" && typeof record?.id === "string";
  const recordId = typeof record?.id === "string" ? record.id : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setErros({});

    const endpoint = apiEndpointByModule[path];
    if (!endpoint) {
      setPending(false);
      setMessage("Este cadastro será habilitado na etapa comercial do módulo.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = form.get(field.name);
      if (typeof raw !== "string" || raw.trim() === "") continue;
      payload[field.name] = field.type === "number" ? Number(raw) : normalizarValorDoCampo(field.type, raw);
    }

    if (path === "admin/usuarios") { payload.roles = [payload.role]; delete payload.role; }
    if (path === "superadmin/tenants") payload.modules = ["assets", "maintenance", "stock", "fleet", "inventories", "reports"];
    if (path === "superadmin/planos") payload.module_keys = ["assets", "stock", "reports"];
    if (path === "almoxarifado/entradas") payload.movement_type = "purchase_in";
    if (path === "almoxarifado/saidas") payload.movement_type = "consumption_out";

    let submitEndpoint = editando ? `${endpoint}/${recordId}` : path === "admin/usuarios" ? "users/invitations" : endpoint;
    if (path === "almoxarifado/transferencias") submitEndpoint = "stock/transfers";
    if (path === "frota/retiradas") submitEndpoint = "fleet/usages/checkout";
    if (path === "frota/devolucoes") {
      submitEndpoint = `fleet/usages/${String(payload.target_usage_id)}/return`;
      delete payload.target_usage_id;
    }
    if (path === "almoxarifado/requisicoes" || path === "solicitar-material") {
      submitEndpoint = "stock/requisitions/with-items";
      payload.requisition_number = payload.number;
      payload.purpose_value = payload.purpose;
      payload.items_value = [{ product_id: payload.product_id, quantity: payload.quantity }];
      payload.target_department_id = payload.department_id;
      payload.target_cost_center_id = payload.cost_center_id;
      for (const chave of ["number", "purpose", "product_id", "quantity", "department_id", "cost_center_id"]) delete payload[chave];
    }

    const { data: { session } } = await createBrowserSupabaseClient().auth.getSession();
    if (!session) {
      setPending(false);
      setMessage("Sua sessão expirou. Entre novamente.");
      return;
    }

    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333").replace(/\/$/, "");
      const response = await fetch(`${base}/v1/${submitEndpoint}`, {
        method: editando ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", "x-tenant-hostname": window.location.hostname },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const corpo: unknown = await response.json();
        setErros(camposInvalidos(corpo));
        throw new Error(mensagemDe(corpo, "Não foi possível salvar o registro."));
      }
      router.push(`/${path}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível conectar à API.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <header>
        <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">{editando ? "Editar cadastro" : "Novo cadastro"}</span>
        <h1 className="mb-1 mt-1.5 text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        <p className="m-0 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>

      <form onSubmit={submit} className="grid gap-4">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-extrabold text-primary">01</span>
            <div>
              <h2 className="m-0 text-base font-semibold">Dados do {singular}</h2>
              <p className="m-0 mt-0.5 text-xs text-muted-foreground">Os campos marcados com asterisco são obrigatórios.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {path === "patrimonio/ativos" || automaticCodePaths.has(path) ? (
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Código interno</span>
                <input
                  value={editando ? textoDoRegistro(record, path === "patrimonio/ativos" ? "internal_code" : "code") : "Gerado automaticamente após salvar"}
                  readOnly
                  aria-readonly="true"
                  className="h-11 rounded-lg border border-border bg-muted px-3 text-sm font-normal text-muted-foreground outline-none"
                />
                <small className="font-normal text-muted-foreground">O código será único por empresa e não poderá ser alterado.</small>
              </label>
            ) : null}
            {fields.map((field) => {
              const invalido = erros[field.name];
              const somenteLeitura = editando && path === "patrimonio/ativos" && field.name === "responsible_user_id";
              return (
                <label key={field.name} className={cn("grid gap-1.5 text-sm font-semibold", field.largura === "cheia" && "md:col-span-2")}>
                  <span>
                    {field.label}
                    {field.required ? <span className="ml-0.5 text-destructive" aria-hidden="true">*</span> : null}
                  </span>

                  {somenteLeitura ? (
                    <>
                      <input
                        value={rotuloDaRelacao(record, field.name) || "Nenhum responsável definido"}
                        readOnly
                        aria-readonly="true"
                        className="h-11 rounded-lg border border-border bg-muted px-3 text-sm font-normal text-muted-foreground outline-none"
                      />
                      <small className="font-normal text-muted-foreground">Altere o responsável por uma movimentação patrimonial.</small>
                    </>
                  ) : field.source ? (
                    <RelationSelect
                      name={field.name}
                      source={field.source}
                      valueKey={field.valueKey}
                      labelKeys={field.labelKeys ?? ["name", "description", "code"]}
                      placeholder={field.placeholder}
                      required={field.required}
                      initialValue={textoDoRegistro(record, field.name)}
                      initialLabel={rotuloDaRelacao(record, field.name)}
                    />
                  ) : field.type === "select" ? (
                    <select
                      name={field.name}
                      required={field.required}
                      defaultValue={textoDoRegistro(record, field.name)}
                      className={cn("h-11 rounded-lg border bg-surface px-3 text-sm font-normal outline-none focus:border-primary", invalido ? "border-destructive" : "border-border")}
                    >
                      <option value="">Selecione uma opção</option>
                      {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      rows={4}
                      placeholder={field.placeholder}
                      required={field.required}
                      defaultValue={valorInicial(record, field.name)}
                      className={cn("rounded-lg border bg-surface px-3 py-2 text-sm font-normal outline-none focus:border-primary", invalido ? "border-destructive" : "border-border")}
                    />
                  ) : (
                    <input
                      name={field.name}
                      type={field.type ?? "text"}
                      step={field.type === "number" ? "any" : undefined}
                      placeholder={field.placeholder}
                      required={field.required}
                      defaultValue={valorInicial(record, field.name)}
                      className={cn("h-11 rounded-lg border bg-surface px-3 text-sm font-normal outline-none focus:border-primary", invalido ? "border-destructive" : "border-border")}
                    />
                  )}

                  {invalido ? <small className="font-normal text-destructive">{invalido.join(" ")}</small> : null}
                </label>
              );
            })}
          </div>
        </section>

        {message ? (
          <p role="alert" className="m-0 rounded-lg border border-destructive/30 bg-tint-rose px-4 py-3 text-sm text-tint-rose-ink">{message}</p>
        ) : null}

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 rounded-xl border border-border bg-surface/95 p-3 backdrop-blur">
          <Link href={`/${path}`} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted">
            Cancelar
          </Link>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Salvando…" : editando ? "Salvar alterações" : `Salvar ${singular}`}
          </button>
        </div>
      </form>
    </div>
  );
}
