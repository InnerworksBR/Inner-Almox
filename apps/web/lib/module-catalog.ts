import { navigationGroups } from "@/lib/navigation";

interface ModuleCopy {
  description: string;
  singular: string;
  primaryAction?: string;
  columns?: string[];
}

const copyByPath: Record<string, ModuleCopy> = {
  "notificacoes": { description: "Alertas e atualizações importantes da sua operação.", singular: "notificação", columns: ["Evento", "Módulo", "Data", "Status"] },
  "meus-ativos": { description: "Itens que estão atualmente sob sua responsabilidade.", singular: "ativo", columns: ["Ativo", "Patrimônio", "Condição", "Desde"] },
  "solicitar-material": { description: "Solicite produtos disponíveis no almoxarifado.", singular: "solicitação", primaryAction: "Nova solicitação", columns: ["Produto", "Quantidade", "Finalidade", "Status"] },
  "minhas-requisicoes": { description: "Acompanhe solicitações, aprovações e retiradas de materiais.", singular: "requisição", columns: ["Número", "Solicitada em", "Itens", "Status"] },
  "meus-termos": { description: "Consulte e aceite termos vinculados a ativos e veículos.", singular: "termo", columns: ["Termo", "Tipo", "Emitido em", "Status"] },
  "perfil": { description: "Mantenha seus dados pessoais e preferências atualizados.", singular: "perfil", primaryAction: "Salvar alterações" },
  "patrimonio/ativos": { description: "Controle todo o ciclo de vida dos bens individualizados.", singular: "ativo", primaryAction: "Cadastrar ativo", columns: ["Código", "Ativo", "Categoria", "Responsável", "Localização", "Status"] },
  "patrimonio/categorias": { description: "Organize ativos e defina campos personalizados por categoria.", singular: "categoria", primaryAction: "Nova categoria", columns: ["Categoria", "Ativos", "Campos personalizados", "Status"] },
  "patrimonio/movimentacoes": { description: "Histórico imutável de entregas, devoluções, empréstimos e transferências.", singular: "movimentação", primaryAction: "Nova movimentação", columns: ["Data", "Tipo", "Ativo", "Origem", "Destino", "Responsável"] },
  "patrimonio/inventarios": { description: "Planeje campanhas, leia QR Codes e trate divergências.", singular: "inventário", primaryAction: "Nova campanha", columns: ["Campanha", "Período", "Progresso", "Divergências", "Status"] },
  "patrimonio/garantias": { description: "Acompanhe coberturas, documentos e vencimentos.", singular: "garantia", primaryAction: "Nova garantia", columns: ["Ativo", "Tipo", "Fornecedor", "Vencimento", "Status"] },
  "patrimonio/manutencoes": { description: "Gerencie ordens preventivas, corretivas, custos e tempo parado.", singular: "ordem de manutenção", primaryAction: "Abrir ordem", columns: ["OS", "Ativo", "Tipo", "Prioridade", "Previsão", "Status"] },
  "patrimonio/relatorios": { description: "Analise patrimônio, responsabilidades, movimentações e custos.", singular: "relatório", primaryAction: "Gerar relatório", columns: ["Relatório", "Última geração", "Formato", "Status"] },
  "almoxarifado/produtos": { description: "Cadastre produtos, unidades, limites e regras de lote.", singular: "produto", primaryAction: "Novo produto", columns: ["SKU", "Produto", "Saldo", "Mínimo", "Local", "Status"] },
  "almoxarifado/entradas": { description: "Registre compras, devoluções e ajustes positivos.", singular: "entrada", primaryAction: "Registrar entrada", columns: ["Data", "Documento", "Produto", "Quantidade", "Fornecedor"] },
  "almoxarifado/saidas": { description: "Registre consumo, perdas, requisições e ajustes negativos.", singular: "saída", primaryAction: "Registrar saída", columns: ["Data", "Tipo", "Produto", "Quantidade", "Destino"] },
  "almoxarifado/transferencias": { description: "Transfira materiais entre estoques e localizações.", singular: "transferência", primaryAction: "Nova transferência", columns: ["Número", "Origem", "Destino", "Itens", "Status"] },
  "almoxarifado/requisicoes": { description: "Aprove, separe e entregue solicitações de materiais.", singular: "requisição", primaryAction: "Nova requisição", columns: ["Número", "Solicitante", "Setor", "Itens", "Status"] },
  "almoxarifado/lotes": { description: "Controle rastreabilidade, validade e custo dos lotes.", singular: "lote", primaryAction: "Novo lote", columns: ["Lote", "Produto", "Validade", "Quantidade", "Localização"] },
  "almoxarifado/inventarios": { description: "Compare saldos físicos e sistêmicos por estoque.", singular: "inventário de estoque", primaryAction: "Iniciar inventário", columns: ["Inventário", "Estoque", "Data", "Divergências", "Status"] },
  "almoxarifado/relatorios": { description: "Analise saldos, consumo, validade e movimentações.", singular: "relatório", primaryAction: "Gerar relatório", columns: ["Relatório", "Última geração", "Formato", "Status"] },
  "frota/veiculos": { description: "Controle cadastro, disponibilidade, documentos e histórico da frota.", singular: "veículo", primaryAction: "Novo veículo", columns: ["Placa", "Veículo", "Filial", "Quilometragem", "Status"] },
  "frota/motoristas": { description: "Gerencie motoristas, CNH, restrições e autorizações.", singular: "motorista", primaryAction: "Novo motorista", columns: ["Motorista", "CNH", "Categoria", "Validade", "Status"] },
  "frota/reservas": { description: "Planeje a utilização e evite conflitos de agenda.", singular: "reserva", primaryAction: "Nova reserva", columns: ["Período", "Veículo", "Condutor", "Finalidade", "Status"] },
  "frota/retiradas": { description: "Registre condutor, destino, checklist e quilometragem inicial.", singular: "retirada", primaryAction: "Retirar veículo", columns: ["Data", "Veículo", "Condutor", "Km inicial", "Status"] },
  "frota/devolucoes": { description: "Finalize utilizações com checklist, avarias e quilometragem final.", singular: "devolução", primaryAction: "Devolver veículo", columns: ["Data", "Veículo", "Condutor", "Distância", "Ocorrências"] },
  "frota/abastecimentos": { description: "Registre combustível, volume, custo e consumo médio.", singular: "abastecimento", primaryAction: "Novo abastecimento", columns: ["Data", "Veículo", "Litros", "Valor", "Km/l"] },
  "frota/despesas": { description: "Centralize pedágios, seguros, manutenção e outros custos.", singular: "despesa", primaryAction: "Nova despesa", columns: ["Data", "Veículo", "Categoria", "Fornecedor", "Valor"] },
  "frota/multas": { description: "Acompanhe infrações, pontos, vencimentos e recursos.", singular: "multa", primaryAction: "Registrar multa", columns: ["Data", "Veículo", "Condutor", "Valor", "Status"] },
  "frota/ocorrencias": { description: "Registre acidentes, avarias, panes e usos indevidos.", singular: "ocorrência", primaryAction: "Nova ocorrência", columns: ["Data", "Tipo", "Veículo", "Condutor", "Status"] },
  "frota/relatorios": { description: "Analise utilização, consumo, custos, multas e documentos.", singular: "relatório", primaryAction: "Gerar relatório", columns: ["Relatório", "Última geração", "Formato", "Status"] },
  "admin/usuarios": { description: "Convide pessoas, defina vínculos, perfis e situação de acesso.", singular: "usuário", primaryAction: "Convidar usuário", columns: ["Usuário", "Filial", "Setor", "Perfil", "Status"] },
  "admin/filiais": { description: "Organize unidades e estabelecimentos da empresa.", singular: "filial", primaryAction: "Nova filial", columns: ["Filial", "Código", "Cidade", "Responsável", "Status"] },
  "admin/setores": { description: "Estruture equipes, gestores e relações departamentais.", singular: "setor", primaryAction: "Novo setor", columns: ["Setor", "Filial", "Gestor", "Colaboradores", "Status"] },
  "admin/centros-de-custo": { description: "Distribua despesas e recursos por centro de custo.", singular: "centro de custo", primaryAction: "Novo centro", columns: ["Código", "Centro de custo", "Responsável", "Status"] },
  "admin/localizacoes": { description: "Modele prédios, andares, salas, depósitos, garagens e estoques.", singular: "localização", primaryAction: "Nova localização", columns: ["Localização", "Tipo", "Filial", "Local superior", "Status"] },
  "admin/fornecedores": { description: "Centralize contatos e fornecedores de bens e serviços.", singular: "fornecedor", primaryAction: "Novo fornecedor", columns: ["Fornecedor", "Documento", "Contato", "Categorias", "Status"] },
  "admin/permissoes": { description: "Controle ações permitidas para cada perfil dentro do tenant.", singular: "perfil de acesso", primaryAction: "Novo perfil", columns: ["Perfil", "Usuários", "Escopo", "Última alteração"] },
  "admin/configuracoes": { description: "Personalize marca, módulos, alertas e regras da empresa.", singular: "configuração", primaryAction: "Salvar alterações" },
  "admin/auditoria": { description: "Consulte a trilha imutável de operações sensíveis.", singular: "evento", columns: ["Data", "Usuário", "Ação", "Entidade", "Identificador"] },
  "superadmin/tenants": { description: "Provisione e administre os clientes da plataforma.", singular: "tenant", primaryAction: "Novo tenant", columns: ["Tenant", "Domínio", "Plano", "Uso", "Status"] },
  "superadmin/dominios": { description: "Valide e vincule domínios white-label.", singular: "domínio", primaryAction: "Novo domínio", columns: ["Domínio", "Tenant", "Principal", "Verificação", "Status"] },
  "superadmin/planos": { description: "Configure planos, limites e disponibilidade comercial.", singular: "plano", primaryAction: "Novo plano", columns: ["Plano", "Tenants", "Limites", "Status"] },
  "superadmin/modulos": { description: "Defina recursos habilitados por tenant e plano.", singular: "módulo", columns: ["Módulo", "Tenants ativos", "Disponibilidade", "Status"] },
  "superadmin/saude": { description: "Monitore aplicação, banco, filas e serviços essenciais.", singular: "serviço", columns: ["Serviço", "Estado", "Latência", "Última verificação"] },
  "superadmin/jobs": { description: "Acompanhe filas, tentativas e processamento assíncrono.", singular: "job", columns: ["Job", "Fila", "Tenant", "Tentativas", "Status"] },
  "superadmin/logs": { description: "Investigue eventos técnicos com acesso controlado e auditado.", singular: "log", columns: ["Data", "Nível", "Serviço", "Evento", "Tenant"] }
};

function titleFromPath(path: string): string {
  const item = navigationGroups.flatMap((group) => group.items).find((entry) => entry.href === `/${path}`);
  if (item) return item.label;
  return path.split("/").at(-1)?.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase()) ?? "Módulo";
}

export function getModuleDefinition(path: string) {
  const normalized = path.replace(/\/novo$/, "");
  const copy = copyByPath[normalized] ?? {
    description: "Gerencie os dados e processos deste módulo.",
    singular: "registro"
  };
  return { ...copy, title: titleFromPath(normalized), path: normalized };
}

export const apiEndpointByModule: Record<string, string> = {
  "admin/usuarios":"users", "admin/filiais":"branches", "admin/setores":"departments", "admin/centros-de-custo":"cost-centers", "admin/localizacoes":"locations", "admin/fornecedores":"suppliers", "admin/auditoria":"audit", "solicitar-material":"my/requisitions", "minhas-requisicoes":"my/requisitions", "meus-ativos":"my/assets", "meus-termos":"my/terms",
  "patrimonio/ativos":"assets", "patrimonio/categorias":"asset-categories", "patrimonio/movimentacoes":"asset-movements", "patrimonio/garantias":"warranties", "patrimonio/manutencoes":"maintenance/orders",
  "almoxarifado/produtos":"stock/products", "almoxarifado/lotes":"stock/batches", "almoxarifado/requisicoes":"stock/requisitions", "almoxarifado/entradas":"stock/movements", "almoxarifado/saidas":"stock/movements", "almoxarifado/transferencias":"stock/movements",
  "frota/veiculos":"fleet/vehicles", "frota/motoristas":"fleet/drivers", "frota/reservas":"fleet/reservations", "frota/retiradas":"fleet/usages", "frota/devolucoes":"fleet/usages", "frota/abastecimentos":"fleet/fuelings", "frota/despesas":"fleet/expenses", "frota/multas":"fleet/fines", "frota/ocorrencias":"fleet/incidents", "notificacoes":"notifications",
  "patrimonio/inventarios":"inventories", "almoxarifado/inventarios":"inventories",
  "superadmin/tenants":"platform/tenants", "superadmin/dominios":"platform/domains", "superadmin/planos":"platform/plans",
  "superadmin/modulos":"platform/modules", "superadmin/jobs":"platform/jobs", "superadmin/logs":"platform/logs"
};
