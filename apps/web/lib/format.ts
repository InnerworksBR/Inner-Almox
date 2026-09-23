const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dataHoraCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const moedaBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

/** Datas puras (2026-09-23) são montadas como locais para não recuar um dia por fuso. */
function paraData(valor: unknown): Date | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const somenteData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  const data = somenteData
    ? new Date(Number(somenteData[1]), Number(somenteData[2]) - 1, Number(somenteData[3]))
    : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarData(valor: unknown): string {
  const data = paraData(valor);
  return data ? dataCurta.format(data) : "—";
}

export function formatarDataHora(valor: unknown): string {
  const data = paraData(valor);
  return data ? dataHoraCurta.format(data) : "—";
}

export function formatarMoeda(valor: unknown): string {
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? moedaBRL.format(numero) : "—";
}

export function formatarNumero(valor: unknown): string {
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? decimal.format(numero) : "—";
}

export function formatarBooleano(valor: unknown): string {
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return "—";
}

export function formatarLista(valor: unknown): string {
  if (!Array.isArray(valor) || valor.length === 0) return "—";
  return valor.map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : "")).filter(Boolean).join(", ") || "—";
}

export function formatarTexto(valor: unknown): string {
  if (typeof valor === "string") return valor.trim() || "—";
  if (typeof valor === "number" || typeof valor === "bigint") return String(valor);
  return "—";
}
