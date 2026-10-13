"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "cn";

import { valorDe } from "@/lib/columns";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Linha = Record<string, unknown>;

interface RelationSelectProps {
  /** Nome do campo enviado no formulário (o valor é o identificador). */
  name: string;
  /** Endpoint da API que lista as opções, como "stock/products". */
  source: string;
  labelKeys: readonly string[];
  valueKey?: string;
  placeholder?: string;
  required?: boolean;
  initialValue?: string;
  initialLabel?: string;
}

const TAMANHO_INICIAL = 100;

function textoDe(linha: Linha, chaves: readonly string[]): string {
  const partes = chaves
    .map((chave) => valorDe(linha, chave))
    .filter((valor): valor is string | number => typeof valor === "string" || typeof valor === "number")
    .map(String)
    .filter((valor) => valor.trim() !== "");
  return partes.join(" — ") || "Registro sem nome";
}

/**
 * Campo de vínculo com busca. Carrega as primeiras opções e, quando o cadastro é
 * maior que isso, passa a consultar o servidor conforme o usuário digita; quando a
 * lista já veio inteira, filtra localmente.
 */
export function RelationSelect({ name, source, labelKeys, valueKey = "id", placeholder, required, initialValue, initialLabel }: RelationSelectProps) {
  const [opcoes, setOpcoes] = useState<Linha[]>([]);
  const [total, setTotal] = useState(0);
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [escolhido, setEscolhido] = useState<{ id: string; rotulo: string } | null>(
    initialValue ? { id: initialValue, rotulo: initialLabel || "Registro selecionado" } : null
  );
  const caixa = useRef<HTMLDivElement>(null);

  const listaCompleta = opcoes.length >= total;

  async function carregar(busca: string) {
    setCarregando(true);
    try {
      const { data: { session } } = await createBrowserSupabaseClient().auth.getSession();
      if (!session) return;
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333").replace(/\/$/, "");
      const query = new URLSearchParams({ tamanho: String(TAMANHO_INICIAL) });
      if (busca.trim()) query.set("busca", busca.trim());
      const resposta = await fetch(`${base}/v1/${source}?${query.toString()}`, {
        headers: { authorization: `Bearer ${session.access_token}`, "x-tenant-hostname": window.location.hostname }
      });
      if (!resposta.ok) return;
      const corpo: unknown = await resposta.json();
      if (typeof corpo !== "object" || corpo === null || !("data" in corpo) || !Array.isArray(corpo.data)) return;
      const linhas = corpo.data.filter((linha): linha is Linha => typeof linha === "object" && linha !== null && !Array.isArray(linha));
      setOpcoes(linhas);
      setTotal("total" in corpo && typeof corpo.total === "number" ? corpo.total : linhas.length);
    } catch {
      // Sem opções o campo continua utilizável: a mensagem de erro vem do envio.
    } finally {
      setCarregando(false);
    }
  }

  // Carga inicial e recarga quando a origem muda.
  useEffect(() => { void carregar(""); }, [source]);

  useEffect(() => {
    if (listaCompleta || escolhido) return;
    const identificador = setTimeout(() => void carregar(termo), 300);
    return () => clearTimeout(identificador);
  }, [termo, listaCompleta, escolhido]);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const visiveis = listaCompleta && termo.trim()
    ? opcoes.filter((linha) => textoDe(linha, labelKeys).toLowerCase().includes(termo.trim().toLowerCase()))
    : opcoes;

  return (
    <div className="relative" ref={caixa}>
      <input type="hidden" name={name} value={escolhido?.id ?? ""} />
      <div className={cn("flex h-11 items-center gap-2 rounded-lg border bg-surface px-3", aberto ? "border-primary" : "border-border")}>
        <input
          type="text"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${name}-opcoes`}
          autoComplete="off"
          required={required && !escolhido}
          value={escolhido?.rotulo ?? termo}
          placeholder={placeholder ?? "Selecione"}
          onFocus={() => setAberto(true)}
          onChange={(evento) => { setEscolhido(null); setTermo(evento.target.value); setAberto(true); }}
          className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
        />
        {carregando ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
        {escolhido ? (
          <button type="button" aria-label="Limpar seleção" onClick={() => { setEscolhido(null); setTermo(""); }} className="grid size-6 shrink-0 place-items-center rounded-md bg-transparent p-0 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      {aberto ? (
        <ul id={`${name}-opcoes`} role="listbox" className="absolute z-30 mt-1 max-h-60 w-full list-none overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
          {visiveis.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{carregando ? "Carregando…" : "Nenhuma opção encontrada"}</li>
          ) : (
            visiveis.map((linha, indice) => {
              const valor = linha[valueKey];
              if (typeof valor !== "string") return null;
              const rotulo = textoDe(linha, labelKeys);
              const ativo = escolhido?.id === valor;
              return (
                <li key={valor || indice} role="option" aria-selected={ativo}>
                  <button
                    type="button"
                    onClick={() => { setEscolhido({ id: valor, rotulo }); setTermo(""); setAberto(false); }}
                    className={cn("flex w-full items-center gap-2 rounded-md bg-transparent px-3 py-2 text-left text-sm text-foreground hover:bg-muted", ativo && "bg-primary-soft text-primary")}
                  >
                    <span className="min-w-0 flex-1 truncate">{rotulo}</span>
                    {ativo ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })
          )}
          {!listaCompleta ? (
            <li className="border-t border-border px-3 py-1.5 text-[0.68rem] text-muted-foreground">
              Mostrando {opcoes.length} de {total}. Digite para buscar os demais.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
