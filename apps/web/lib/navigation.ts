export interface NavigationItem {
  href: string;
  label: string;
  marker: string;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  { label: "Visão geral", items: [
    { href: "/dashboard", label: "Início", marker: "IN" },
    { href: "/notificacoes", label: "Notificações", marker: "NT" }
  ]},
  { label: "Meu espaço", items: [
    { href: "/meus-ativos", label: "Meus ativos", marker: "MA" },
    { href: "/solicitar-material", label: "Solicitar material", marker: "SM" },
    { href: "/minhas-requisicoes", label: "Minhas requisições", marker: "MR" },
    { href: "/meus-termos", label: "Meus termos", marker: "MT" }
  ]},
  { label: "Patrimônio", items: [
    { href: "/patrimonio", label: "Dashboard", marker: "PD" },
    { href: "/patrimonio/ativos", label: "Ativos", marker: "AT" },
    { href: "/patrimonio/categorias", label: "Categorias", marker: "CA" },
    { href: "/patrimonio/movimentacoes", label: "Movimentações", marker: "MV" },
    { href: "/patrimonio/inventarios", label: "Inventários", marker: "IV" },
    { href: "/patrimonio/garantias", label: "Garantias", marker: "GA" },
    { href: "/patrimonio/manutencoes", label: "Manutenções", marker: "MN" },
    { href: "/patrimonio/relatorios", label: "Relatórios", marker: "RE" }
  ]},
  { label: "Almoxarifado", items: [
    { href: "/almoxarifado", label: "Dashboard", marker: "AD" },
    { href: "/almoxarifado/produtos", label: "Produtos", marker: "PR" },
    { href: "/almoxarifado/entradas", label: "Entradas", marker: "EN" },
    { href: "/almoxarifado/saidas", label: "Saídas", marker: "SA" },
    { href: "/almoxarifado/transferencias", label: "Transferências", marker: "TR" },
    { href: "/almoxarifado/requisicoes", label: "Requisições", marker: "RQ" },
    { href: "/almoxarifado/lotes", label: "Lotes", marker: "LO" },
    { href: "/almoxarifado/inventarios", label: "Inventários", marker: "AI" },
    { href: "/almoxarifado/relatorios", label: "Relatórios", marker: "AR" }
  ]},
  { label: "Frota", items: [
    { href: "/frota", label: "Dashboard", marker: "FD" },
    { href: "/frota/veiculos", label: "Veículos", marker: "VE" },
    { href: "/frota/motoristas", label: "Motoristas", marker: "MO" },
    { href: "/frota/reservas", label: "Reservas", marker: "RS" },
    { href: "/frota/retiradas", label: "Retiradas", marker: "RT" },
    { href: "/frota/devolucoes", label: "Devoluções", marker: "DV" },
    { href: "/frota/abastecimentos", label: "Abastecimentos", marker: "AB" },
    { href: "/frota/despesas", label: "Despesas", marker: "DE" },
    { href: "/frota/multas", label: "Multas", marker: "MU" },
    { href: "/frota/ocorrencias", label: "Ocorrências", marker: "OC" },
    { href: "/frota/relatorios", label: "Relatórios", marker: "FR" }
  ]},
  { label: "Administração", items: [
    { href: "/admin/usuarios", label: "Usuários", marker: "US" },
    { href: "/admin/filiais", label: "Filiais", marker: "FI" },
    { href: "/admin/setores", label: "Setores", marker: "SE" },
    { href: "/admin/centros-de-custo", label: "Centros de custo", marker: "CC" },
    { href: "/admin/localizacoes", label: "Localizações", marker: "LC" },
    { href: "/admin/fornecedores", label: "Fornecedores", marker: "FO" },
    { href: "/admin/permissoes", label: "Permissões", marker: "PE" },
    { href: "/admin/configuracoes", label: "Configurações", marker: "CF" },
    { href: "/admin/auditoria", label: "Auditoria", marker: "AU" }
  ]},
  { label: "InnerWorks", items: [
    { href: "/superadmin/tenants", label: "Tenants", marker: "TE" },
    { href: "/superadmin/dominios", label: "Domínios", marker: "DO" },
    { href: "/superadmin/planos", label: "Planos", marker: "PL" },
    { href: "/superadmin/modulos", label: "Módulos", marker: "MD" },
    { href: "/superadmin/saude", label: "Saúde", marker: "SD" },
    { href: "/superadmin/jobs", label: "Jobs", marker: "JB" },
    { href: "/superadmin/logs", label: "Logs", marker: "LG" }
  ]}
];
