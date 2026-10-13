export type TipoColuna = "texto" | "codigo" | "data" | "datahora" | "moeda" | "numero" | "status" | "booleano" | "lista" | "destaque" | "soma";

export interface Coluna {
  titulo: string;
  /** Caminho do dado na linha. Aceita relacionamento, como "asset_categories.name". */
  campo: string;
  tipo?: TipoColuna;
  /** Campo usado ao ordenar; ausente significa coluna não ordenável. */
  ordenavel?: string;
  /** Oculta a coluna em telas estreitas, para a tabela caber no celular. */
  secundaria?: boolean;
  /** Para o tipo "soma": campo numérico dentro da lista apontada por `campo`. */
  subcampo?: string;
}

/**
 * Colunas por tela, apontando para o campo real devolvido pela API. Substitui a
 * adivinhação antiga, que tentava casar o rótulo em português com o nome do campo.
 */
const colunasPorRota: Record<string, Coluna[]> = {
  // Meu espaço
  "meus-ativos": [
    { titulo: "Código", campo: "internal_code", tipo: "destaque", ordenavel: "internal_code" },
    { titulo: "Ativo", campo: "description", ordenavel: "description" },
    { titulo: "Categoria", campo: "asset_categories.name", secundaria: true },
    { titulo: "Localização", campo: "locations.name", secundaria: true },
    { titulo: "Condição", campo: "condition", tipo: "status" },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "meus-termos": [
    { titulo: "Código", campo: "validation_code", tipo: "destaque" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Ativo", campo: "assets.description" },
    { titulo: "Emitido em", campo: "created_at", tipo: "data", ordenavel: "created_at" },
    { titulo: "Aceite", campo: "accepted_at", tipo: "data", ordenavel: "accepted_at" }
  ],
  "solicitar-material": [
    { titulo: "Número", campo: "number", tipo: "destaque", ordenavel: "number" },
    { titulo: "Finalidade", campo: "purpose" },
    { titulo: "Setor", campo: "departments.name", secundaria: true },
    { titulo: "Criada em", campo: "created_at", tipo: "data", ordenavel: "created_at", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "notificacoes": [
    { titulo: "Evento", campo: "title", tipo: "destaque" },
    { titulo: "Mensagem", campo: "message" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type", secundaria: true },
    { titulo: "Recebida em", campo: "created_at", tipo: "datahora", ordenavel: "created_at" },
    { titulo: "Leitura", campo: "read_at", tipo: "data", ordenavel: "read_at", secundaria: true }
  ],

  // Patrimônio
  "patrimonio/ativos": [
    { titulo: "Código", campo: "internal_code", tipo: "destaque", ordenavel: "internal_code" },
    { titulo: "Ativo", campo: "description", ordenavel: "description" },
    { titulo: "Categoria", campo: "asset_categories.name", secundaria: true },
    { titulo: "Responsável", campo: "profiles.full_name" },
    { titulo: "Localização", campo: "locations.name", secundaria: true },
    { titulo: "Valor", campo: "purchase_value", tipo: "moeda", ordenavel: "purchase_value", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "patrimonio/categorias": [
    { titulo: "Categoria", campo: "name", tipo: "destaque", ordenavel: "name" },
    { titulo: "Descrição", campo: "description" },
    { titulo: "Criada em", campo: "created_at", tipo: "data", ordenavel: "created_at", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "patrimonio/movimentacoes": [
    { titulo: "Data", campo: "occurred_at", tipo: "datahora", ordenavel: "occurred_at" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Ativo", campo: "assets.description", tipo: "destaque" },
    { titulo: "Responsável", campo: "responsavel.full_name" },
    { titulo: "Registrado por", campo: "executor.full_name", secundaria: true },
    { titulo: "Motivo", campo: "reason", secundaria: true }
  ],
  "patrimonio/inventarios": [
    { titulo: "Campanha", campo: "name", tipo: "destaque", ordenavel: "name" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", secundaria: true },
    { titulo: "Início", campo: "starts_at", tipo: "data", ordenavel: "starts_at" },
    { titulo: "Fim", campo: "ends_at", tipo: "data", ordenavel: "ends_at", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "patrimonio/garantias": [
    { titulo: "Ativo", campo: "assets.description", tipo: "destaque" },
    { titulo: "Tipo", campo: "type" },
    { titulo: "Fornecedor", campo: "provider", secundaria: true },
    { titulo: "Início", campo: "starts_at", tipo: "data", ordenavel: "starts_at", secundaria: true },
    { titulo: "Vencimento", campo: "ends_at", tipo: "data", ordenavel: "ends_at" },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "patrimonio/manutencoes": [
    { titulo: "OS", campo: "number", tipo: "destaque", ordenavel: "number" },
    { titulo: "Ativo", campo: "assets.description" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type", secundaria: true },
    { titulo: "Prioridade", campo: "priority", tipo: "codigo", ordenavel: "priority", secundaria: true },
    { titulo: "Previsão", campo: "expected_at", tipo: "data", ordenavel: "expected_at" },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],

  // Almoxarifado
  "almoxarifado/produtos": [
    { titulo: "Código", campo: "code", tipo: "destaque", ordenavel: "code" },
    { titulo: "Produto", campo: "name", ordenavel: "name" },
    { titulo: "Categoria", campo: "stock_categories.name", secundaria: true },
    { titulo: "Saldo", campo: "stock_balances", tipo: "soma", subcampo: "quantity" },
    { titulo: "Mínimo", campo: "minimum_stock", tipo: "numero", ordenavel: "minimum_stock", secundaria: true },
    { titulo: "Unidade", campo: "unit", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "almoxarifado/estoques": [
    { titulo: "Código", campo: "code", tipo: "destaque", ordenavel: "code" },
    { titulo: "Estoque", campo: "name", ordenavel: "name" },
    { titulo: "Localização", campo: "locations.name", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "almoxarifado/entradas": [
    { titulo: "Data", campo: "occurred_at", tipo: "datahora", ordenavel: "occurred_at" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Produto", campo: "stock_products.name", tipo: "destaque" },
    { titulo: "Quantidade", campo: "quantity", tipo: "numero", ordenavel: "quantity" },
    { titulo: "Estoque", campo: "stock_locations.name", secundaria: true },
    { titulo: "Documento", campo: "document_number", secundaria: true }
  ],
  "almoxarifado/saidas": [
    { titulo: "Data", campo: "occurred_at", tipo: "datahora", ordenavel: "occurred_at" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Produto", campo: "stock_products.name", tipo: "destaque" },
    { titulo: "Quantidade", campo: "quantity", tipo: "numero", ordenavel: "quantity" },
    { titulo: "Setor", campo: "departments.name", secundaria: true },
    { titulo: "Registrado por", campo: "executor.full_name", secundaria: true }
  ],
  "almoxarifado/transferencias": [
    { titulo: "Data", campo: "occurred_at", tipo: "datahora", ordenavel: "occurred_at" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Produto", campo: "stock_products.name", tipo: "destaque" },
    { titulo: "Quantidade", campo: "quantity", tipo: "numero", ordenavel: "quantity" },
    { titulo: "Estoque", campo: "stock_locations.name" },
    { titulo: "Motivo", campo: "reason", secundaria: true }
  ],
  "almoxarifado/requisicoes": [
    { titulo: "Número", campo: "number", tipo: "destaque", ordenavel: "number" },
    { titulo: "Solicitante", campo: "solicitante.full_name" },
    { titulo: "Setor", campo: "departments.name", secundaria: true },
    { titulo: "Finalidade", campo: "purpose", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "almoxarifado/lotes": [
    { titulo: "Lote", campo: "number", tipo: "destaque", ordenavel: "number" },
    { titulo: "Produto", campo: "stock_products.name" },
    { titulo: "Estoque", campo: "stock_locations.name", secundaria: true },
    { titulo: "Entrada", campo: "received_at", tipo: "data", secundaria: true },
    { titulo: "Validade", campo: "expires_at", tipo: "data", ordenavel: "expires_at" },
    { titulo: "Custo", campo: "unit_cost", tipo: "moeda", secundaria: true }
  ],
  "almoxarifado/inventarios": [
    { titulo: "Campanha", campo: "name", tipo: "destaque", ordenavel: "name" },
    { titulo: "Início", campo: "starts_at", tipo: "data", ordenavel: "starts_at" },
    { titulo: "Fim", campo: "ends_at", tipo: "data", ordenavel: "ends_at", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],

  // Frota
  "frota/veiculos": [
    { titulo: "Placa", campo: "plate", tipo: "destaque", ordenavel: "plate" },
    { titulo: "Veículo", campo: "model", ordenavel: "model" },
    { titulo: "Marca", campo: "brand", ordenavel: "brand", secundaria: true },
    { titulo: "Filial", campo: "branches.name", secundaria: true },
    { titulo: "Quilometragem", campo: "current_mileage", tipo: "numero", ordenavel: "current_mileage" },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "frota/motoristas": [
    { titulo: "Motorista", campo: "tenant_memberships.profiles.full_name", tipo: "destaque" },
    { titulo: "CNH", campo: "license_number" },
    { titulo: "Categoria", campo: "category", ordenavel: "category" },
    { titulo: "Validade", campo: "expires_at", tipo: "data", ordenavel: "expires_at" },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "frota/autorizacoes": [
    { titulo: "Motorista", campo: "vehicle_drivers.license_number", tipo: "destaque" },
    { titulo: "Veículo", campo: "vehicles.plate" },
    { titulo: "Tipo", campo: "vehicle_type", secundaria: true },
    { titulo: "Válida até", campo: "valid_until", tipo: "data", ordenavel: "valid_until" },
    { titulo: "Status", campo: "active", tipo: "booleano", ordenavel: "active" }
  ],
  "frota/reservas": [
    { titulo: "Início", campo: "starts_at", tipo: "datahora", ordenavel: "starts_at" },
    { titulo: "Fim", campo: "ends_at", tipo: "datahora", ordenavel: "ends_at", secundaria: true },
    { titulo: "Veículo", campo: "vehicles.plate", tipo: "destaque" },
    { titulo: "Motorista", campo: "vehicle_drivers.license_number", secundaria: true },
    { titulo: "Destino", campo: "destination" },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "frota/retiradas": [
    { titulo: "Saída", campo: "checked_out_at", tipo: "datahora", ordenavel: "checked_out_at" },
    { titulo: "Veículo", campo: "vehicles.plate", tipo: "destaque" },
    { titulo: "Motorista", campo: "vehicle_drivers.tenant_memberships.profiles.full_name" },
    { titulo: "Km inicial", campo: "initial_mileage", tipo: "numero" },
    { titulo: "Destino", campo: "destination", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "frota/devolucoes": [
    { titulo: "Retorno", campo: "returned_at", tipo: "datahora", ordenavel: "returned_at" },
    { titulo: "Veículo", campo: "vehicles.plate", tipo: "destaque" },
    { titulo: "Motorista", campo: "vehicle_drivers.tenant_memberships.profiles.full_name" },
    { titulo: "Km inicial", campo: "initial_mileage", tipo: "numero", secundaria: true },
    { titulo: "Km final", campo: "final_mileage", tipo: "numero" },
    { titulo: "Avarias", campo: "damages", secundaria: true }
  ],
  "frota/abastecimentos": [
    { titulo: "Data", campo: "occurred_at", tipo: "datahora", ordenavel: "occurred_at" },
    { titulo: "Veículo", campo: "vehicles.plate", tipo: "destaque" },
    { titulo: "Posto", campo: "station", secundaria: true },
    { titulo: "Litros", campo: "liters", tipo: "numero", ordenavel: "liters" },
    { titulo: "Valor", campo: "total_amount", tipo: "moeda", ordenavel: "total_amount" },
    { titulo: "Quilometragem", campo: "mileage", tipo: "numero", ordenavel: "mileage", secundaria: true }
  ],
  "frota/despesas": [
    { titulo: "Data", campo: "occurred_at", tipo: "data", ordenavel: "occurred_at" },
    { titulo: "Veículo", campo: "vehicles.plate", tipo: "destaque" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Descrição", campo: "description", secundaria: true },
    { titulo: "Valor", campo: "amount", tipo: "moeda", ordenavel: "amount" }
  ],
  "frota/multas": [
    { titulo: "Data", campo: "occurred_at", tipo: "datahora", ordenavel: "occurred_at" },
    { titulo: "Veículo", campo: "vehicles.plate", tipo: "destaque" },
    { titulo: "Infração", campo: "type" },
    { titulo: "Valor", campo: "amount", tipo: "moeda", ordenavel: "amount" },
    { titulo: "Vencimento", campo: "due_at", tipo: "data", ordenavel: "due_at", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "frota/ocorrencias": [
    { titulo: "Data", campo: "occurred_at", tipo: "datahora", ordenavel: "occurred_at" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Veículo", campo: "vehicles.plate", tipo: "destaque" },
    { titulo: "Descrição", campo: "description", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],

  // Administração
  "admin/usuarios": [
    { titulo: "Usuário", campo: "full_name", tipo: "destaque" },
    { titulo: "E-mail", campo: "email" },
    { titulo: "Matrícula", campo: "employee_number", secundaria: true },
    { titulo: "Cargo", campo: "employee_position", secundaria: true },
    { titulo: "Perfis", campo: "roles", tipo: "lista" },
    { titulo: "Situação", campo: "membership_status", tipo: "status" }
  ],
  "admin/filiais": [
    { titulo: "Código", campo: "code", tipo: "destaque", ordenavel: "code" },
    { titulo: "Filial", campo: "name", ordenavel: "name" },
    { titulo: "Razão social", campo: "legal_name", secundaria: true },
    { titulo: "CNPJ", campo: "tax_id", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "admin/setores": [
    { titulo: "Código", campo: "code", tipo: "destaque", ordenavel: "code" },
    { titulo: "Setor", campo: "name", ordenavel: "name" },
    { titulo: "Filial", campo: "branches.name", secundaria: true },
    { titulo: "Centro de custo", campo: "cost_centers.name", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "admin/centros-de-custo": [
    { titulo: "Código", campo: "code", tipo: "destaque", ordenavel: "code" },
    { titulo: "Centro de custo", campo: "name", ordenavel: "name" },
    { titulo: "Descrição", campo: "description", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "admin/localizacoes": [
    { titulo: "Código", campo: "code", tipo: "destaque", ordenavel: "code" },
    { titulo: "Localização", campo: "name", ordenavel: "name" },
    { titulo: "Tipo", campo: "type", tipo: "codigo", ordenavel: "type" },
    { titulo: "Filial", campo: "branches.name", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "admin/fornecedores": [
    { titulo: "Fornecedor", campo: "legal_name", tipo: "destaque", ordenavel: "legal_name" },
    { titulo: "Nome fantasia", campo: "trade_name", secundaria: true },
    { titulo: "Documento", campo: "tax_id" },
    { titulo: "Contato", campo: "contact_name", secundaria: true },
    { titulo: "E-mail", campo: "email", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status", ordenavel: "status" }
  ],
  "admin/permissoes": [
    { titulo: "Perfil", campo: "role", tipo: "destaque" },
    { titulo: "Usuários", campo: "total" },
    { titulo: "Escopo", campo: "scope" }
  ],
  "admin/auditoria": [
    { titulo: "Data", campo: "created_at", tipo: "datahora", ordenavel: "created_at" },
    { titulo: "Usuário", campo: "profiles.full_name" },
    { titulo: "Ação", campo: "action", tipo: "destaque", ordenavel: "action" },
    { titulo: "Entidade", campo: "entity_type", ordenavel: "entity_type" },
    { titulo: "Identificador", campo: "entity_id", secundaria: true }
  ],

  // InnerWorks
  "superadmin/tenants": [
    { titulo: "Tenant", campo: "legal_name", tipo: "destaque" },
    { titulo: "Slug", campo: "slug" },
    { titulo: "Produto", campo: "product_name", secundaria: true },
    { titulo: "Plano", campo: "plan" },
    { titulo: "Criado em", campo: "created_at", tipo: "data", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status" }
  ],
  "superadmin/dominios": [
    { titulo: "Domínio", campo: "hostname", tipo: "destaque" },
    { titulo: "Principal", campo: "is_primary", tipo: "booleano" },
    { titulo: "Verificado em", campo: "verified_at", tipo: "data" },
    { titulo: "Criado em", campo: "created_at", tipo: "data", secundaria: true }
  ],
  "superadmin/planos": [
    { titulo: "Código", campo: "code", tipo: "destaque" },
    { titulo: "Plano", campo: "name" },
    { titulo: "Descrição", campo: "description", secundaria: true },
    { titulo: "Usuários", campo: "user_limit", tipo: "numero" },
    { titulo: "Ativos", campo: "asset_limit", tipo: "numero", secundaria: true },
    { titulo: "Status", campo: "status", tipo: "status" }
  ],
  "superadmin/modulos": [
    { titulo: "Módulo", campo: "module_key", tipo: "destaque" },
    { titulo: "Habilitado", campo: "enabled", tipo: "booleano" },
    { titulo: "Atualizado em", campo: "updated_at", tipo: "data" }
  ],
  "superadmin/saude": [
    { titulo: "Serviço", campo: "servico", tipo: "destaque" },
    { titulo: "Estado", campo: "estado" },
    { titulo: "Latência", campo: "latencia_ms", tipo: "numero" },
    { titulo: "Última verificação", campo: "verificado_em", tipo: "datahora" }
  ],
  "superadmin/jobs": [
    { titulo: "Fila", campo: "queue", tipo: "destaque" },
    { titulo: "Tipo", campo: "type" },
    { titulo: "Tentativas", campo: "attempts", tipo: "numero" },
    { titulo: "Criado em", campo: "created_at", tipo: "datahora" },
    { titulo: "Status", campo: "status", tipo: "status" }
  ],
  "superadmin/logs": [
    { titulo: "Data", campo: "created_at", tipo: "datahora" },
    { titulo: "Ação", campo: "action", tipo: "destaque" },
    { titulo: "Entidade", campo: "entity_type" },
    { titulo: "Identificador", campo: "entity_id", secundaria: true }
  ]
};

/** "minhas-requisicoes" usa exatamente a mesma leitura de "solicitar-material". */
colunasPorRota["minhas-requisicoes"] = colunasPorRota["solicitar-material"] ?? [];

/**
 * Telas atendidas por endpoints que ainda não suportam busca e paginação
 * (administração de usuários e painel da plataforma). Nelas a barra de busca é
 * omitida, em vez de exibir um campo que não filtraria nada.
 */
export const rotasSemBusca = new Set([
  "admin/permissoes",
]);

export function colunasDe(rota: string): Coluna[] | null {
  return colunasPorRota[rota] ?? null;
}

/** Lê "asset_categories.name" dentro da linha, inclusive quando o caminho não existe. */
export function valorDe(linha: Record<string, unknown>, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((atual, parte) => {
    if (typeof atual !== "object" || atual === null || Array.isArray(atual)) return undefined;
    return (atual as Record<string, unknown>)[parte];
  }, linha);
}

/** Soma um campo numérico dentro de uma lista relacionada, como os saldos de um produto. */
export function somaDe(linha: Record<string, unknown>, campo: string, subcampo: string): number | null {
  const lista = valorDe(linha, campo);
  if (!Array.isArray(lista)) return null;
  return lista.reduce<number>((total, item) => {
    if (typeof item !== "object" || item === null) return total;
    const valor = (item as Record<string, unknown>)[subcampo];
    const numero = typeof valor === "number" ? valor : Number(valor);
    return Number.isFinite(numero) ? total + numero : total;
  }, 0);
}
