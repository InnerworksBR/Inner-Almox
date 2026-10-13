export type PermissionRole =
  | "tenant_admin"
  | "asset_manager"
  | "warehouse_manager"
  | "fleet_manager"
  | "maintenance_manager"
  | "department_manager"
  | "employee"
  | "auditor";

export interface PermissionModule {
  key: "admin" | "patrimonio" | "almoxarifado" | "frota" | "manutencao" | "setor" | "auditoria";
  label: string;
  actions: string[];
}

export interface RolePermissionDefinition {
  label: string;
  description: string;
  modules: PermissionModule[];
}

const module = (key: PermissionModule["key"], label: string, actions: string[]): PermissionModule => ({ key, label, actions });

export const rolePermissions: Record<PermissionRole, RolePermissionDefinition> = {
  tenant_admin: {
    label: "Administrador do tenant",
    description: "Administra o ambiente, as pessoas e as configurações do tenant.",
    modules: [module("admin", "Administração", ["Configurar identidade visual", "Gerenciar usuários", "Gerenciar filiais", "Gerenciar setores", "Gerenciar centros de custo", "Gerenciar permissões", "Consultar relatórios gerais", "Configurar integrações"])]
  },
  asset_manager: {
    label: "Gestor de patrimônio",
    description: "Controla o ciclo de vida dos ativos e seus inventários.",
    modules: [module("patrimonio", "Patrimônio", ["Cadastrar ativos", "Editar ativos", "Realizar movimentações", "Emitir termos", "Gerenciar garantias", "Executar inventários", "Registrar baixas"])]
  },
  warehouse_manager: {
    label: "Almoxarife",
    description: "Controla produtos, estoques, lotes e requisições.",
    modules: [module("almoxarifado", "Almoxarifado", ["Cadastrar produtos", "Registrar entradas", "Registrar saídas", "Gerenciar lotes", "Gerenciar transferências", "Separar requisições", "Realizar inventários de estoque"])]
  },
  fleet_manager: {
    label: "Gestor de frota",
    description: "Administra veículos, motoristas, uso e custos da frota.",
    modules: [module("frota", "Frota", ["Cadastrar veículos", "Gerenciar motoristas", "Gerenciar reservas", "Registrar utilização", "Controlar quilometragem", "Controlar combustível", "Controlar documentos e revisões"])]
  },
  maintenance_manager: {
    label: "Gestor de manutenção",
    description: "Coordena ordens, diagnósticos, custos e manutenções preventivas.",
    modules: [module("manutencao", "Manutenção", ["Abrir ordens de serviço", "Registrar diagnósticos", "Registrar custos", "Programar manutenções preventivas", "Acompanhar fornecedores", "Encerrar manutenções"])]
  },
  department_manager: {
    label: "Gestor de setor",
    description: "Acompanha ativos, colaboradores e requisições da equipe.",
    modules: [module("setor", "Setor", ["Visualizar ativos do próprio setor", "Visualizar colaboradores da equipe", "Solicitar materiais", "Aprovar requisições", "Consultar pendências da equipe"])]
  },
  employee: {
    label: "Colaborador",
    description: "Consulta seus recursos e participa das operações atribuídas.",
    modules: [
      module("patrimonio", "Patrimônio", ["Visualizar ativos sob sua responsabilidade", "Aceitar termos", "Registrar problema"]),
      module("almoxarifado", "Almoxarifado", ["Solicitar materiais"]),
      module("frota", "Frota", ["Retirar e devolver veículo", "Informar quilometragem", "Preencher checklist"])
    ]
  },
  auditor: {
    label: "Auditor",
    description: "Consulta informações autorizadas sem executar mutações.",
    modules: [module("auditoria", "Auditoria", ["Visualizar históricos", "Visualizar inventários", "Visualizar documentos", "Exportar relatórios autorizados"])]
  }
};
