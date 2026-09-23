export type TomStatus = "neutro" | "positivo" | "atencao" | "critico" | "info";

interface DescricaoStatus {
  rotulo: string;
  tom: TomStatus;
}

/**
 * Dicionário único dos status do sistema. Os códigos são consistentes entre os
 * domínios (um "cancelled" de requisição significa o mesmo que o de uma ordem),
 * então um mapa central evita repetir tradução em cada tela.
 */
const statusConhecidos: Record<string, DescricaoStatus> = {
  // Situações gerais
  active: { rotulo: "Ativo", tom: "positivo" },
  inactive: { rotulo: "Inativo", tom: "neutro" },
  suspended: { rotulo: "Suspenso", tom: "critico" },
  invited: { rotulo: "Convidado", tom: "info" },
  cancelled: { rotulo: "Cancelada", tom: "neutro" },
  completed: { rotulo: "Concluída", tom: "positivo" },
  draft: { rotulo: "Rascunho", tom: "neutro" },

  // Ativos
  available: { rotulo: "Disponível", tom: "positivo" },
  in_use: { rotulo: "Em uso", tom: "info" },
  reserved: { rotulo: "Reservado", tom: "info" },
  loaned: { rotulo: "Emprestado", tom: "info" },
  in_maintenance: { rotulo: "Em manutenção", tom: "atencao" },
  awaiting_maintenance: { rotulo: "Aguardando manutenção", tom: "atencao" },
  in_transfer: { rotulo: "Em transferência", tom: "info" },
  lost: { rotulo: "Extraviado", tom: "critico" },
  damaged: { rotulo: "Danificado", tom: "critico" },
  obsolete: { rotulo: "Obsoleto", tom: "neutro" },
  disposed: { rotulo: "Baixado", tom: "neutro" },
  sold: { rotulo: "Vendido", tom: "neutro" },
  donated: { rotulo: "Doado", tom: "neutro" },

  // Conservação
  new: { rotulo: "Novo", tom: "positivo" },
  good: { rotulo: "Bom", tom: "positivo" },
  fair: { rotulo: "Regular", tom: "atencao" },
  poor: { rotulo: "Ruim", tom: "critico" },

  // Garantias e documentos
  expired: { rotulo: "Vencida", tom: "critico" },
  valid: { rotulo: "Válido", tom: "positivo" },

  // Ordens de manutenção
  open: { rotulo: "Aberta", tom: "info" },
  analysis: { rotulo: "Em análise", tom: "info" },
  awaiting_approval: { rotulo: "Aguardando aprovação", tom: "atencao" },
  awaiting_supplier: { rotulo: "Aguardando fornecedor", tom: "atencao" },
  awaiting_part: { rotulo: "Aguardando peça", tom: "atencao" },
  in_progress: { rotulo: "Em execução", tom: "info" },

  // Requisições
  requested: { rotulo: "Solicitada", tom: "info" },
  approved: { rotulo: "Aprovada", tom: "positivo" },
  rejected: { rotulo: "Rejeitada", tom: "critico" },
  separating: { rotulo: "Em separação", tom: "info" },
  ready: { rotulo: "Pronta para retirada", tom: "positivo" },
  delivered: { rotulo: "Entregue", tom: "positivo" },
  partially_fulfilled: { rotulo: "Parcialmente atendida", tom: "atencao" },

  // Frota
  unavailable: { rotulo: "Indisponível", tom: "neutro" },
  returned_to_lessor: { rotulo: "Devolvido à locadora", tom: "neutro" },
  appealed: { rotulo: "Em recurso", tom: "atencao" },
  paid: { rotulo: "Paga", tom: "positivo" },
  investigating: { rotulo: "Em investigação", tom: "atencao" },
  resolved: { rotulo: "Resolvida", tom: "positivo" },

  // Inventário
  planned: { rotulo: "Planejada", tom: "info" },
  reconciling: { rotulo: "Em reconciliação", tom: "atencao" },
  pending: { rotulo: "Pendente", tom: "atencao" },
  located: { rotulo: "Localizado", tom: "positivo" },
  not_found: { rotulo: "Não localizado", tom: "critico" },
  wrong_location: { rotulo: "Local divergente", tom: "atencao" },
  wrong_responsible: { rotulo: "Responsável divergente", tom: "atencao" },
  unlabeled: { rotulo: "Sem etiqueta", tom: "atencao" },
  unregistered: { rotulo: "Não cadastrado", tom: "critico" },
  duplicate: { rotulo: "Duplicado", tom: "atencao" },
  divergent_quantity: { rotulo: "Quantidade divergente", tom: "atencao" }
};

/** Tipos de movimentação e demais códigos que aparecem como coluna de texto. */
const tiposConhecidos: Record<string, string> = {
  delivery: "Entrega", return: "Devolução", loan: "Empréstimo",
  department_transfer: "Transferência de setor", branch_transfer: "Transferência de filial",
  maintenance_out: "Envio para manutenção", maintenance_return: "Retorno de manutenção",
  disposal: "Baixa", sale: "Venda", donation: "Doação", loss: "Extravio",
  purchase_in: "Entrada por compra", return_in: "Entrada por devolução",
  positive_adjustment: "Ajuste positivo", consumption_out: "Saída por consumo",
  requisition_out: "Saída por requisição", loss_out: "Saída por perda",
  negative_adjustment: "Ajuste negativo", transfer_in: "Transferência (entrada)",
  transfer_out: "Transferência (saída)", inventory: "Inventário",
  preventive: "Preventiva", corrective: "Corretiva", inspection: "Inspeção",
  calibration: "Calibração", revision: "Revisão", cleaning: "Limpeza",
  update: "Atualização", part_replacement: "Troca de peça",
  assets: "Patrimônio", stock: "Estoque",
  low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
  toll: "Pedágio", parking: "Estacionamento", washing: "Lavagem", fine: "Multa",
  insurance: "Seguro", licensing: "Licenciamento", tire: "Pneu", maintenance: "Manutenção",
  rental: "Locação", other: "Outros",
  accident: "Acidente", theft: "Furto", breakdown: "Pane", misuse: "Uso indevido",
  mileage_divergence: "Divergência de quilometragem", out_of_fuel: "Falta de combustível",
  late_return: "Atraso na devolução",
  building: "Prédio", floor: "Andar", room: "Sala", warehouse: "Almoxarifado",
  garage: "Garagem", internal: "Interna", email: "E-mail",
  checkout: "Retirada", image: "Imagem", invoice: "Nota fiscal", warranty: "Garantia",
  contract: "Contrato", manual: "Manual", report: "Laudo", certificate: "Certificado",
  date: "Data", days: "Dias", mileage: "Quilometragem", hours: "Horas",
  cycles: "Ciclos", manufacturer: "Fabricante",
  // Eventos das notificações automáticas
  warranty_expiry: "Garantia vencendo", low_stock: "Estoque abaixo do mínimo",
  requisition_requested: "Requisição aberta", requisition_fulfilled: "Requisição atendida",
  maintenance_due: "Manutenção próxima", document_expiry: "Documento vencendo"
};

export function descreverStatus(valor: unknown): DescricaoStatus | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  return statusConhecidos[valor] ?? { rotulo: traduzirCodigo(valor), tom: "neutro" };
}

/** Converte códigos em rótulos legíveis; o que não estiver no dicionário vira texto capitalizado. */
export function traduzirCodigo(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim() === "") return "—";
  const conhecido = tiposConhecidos[valor] ?? statusConhecidos[valor]?.rotulo;
  if (conhecido) return conhecido;
  return valor.replaceAll("_", " ").replace(/^./, (letra) => letra.toUpperCase());
}
