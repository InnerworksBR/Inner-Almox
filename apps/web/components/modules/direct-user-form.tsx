"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";

import { RelationSelect } from "@/components/modules/relation-select";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface DirectUserField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password";
  required?: boolean;
  source?: string;
  labelKeys?: readonly string[];
}

const filial = { source: "branches", labelKeys: ["name", "code"] } as const;
const setor = { source: "departments", labelKeys: ["name", "code"] } as const;
const centro = { source: "cost-centers", labelKeys: ["name", "code"] } as const;

const fields: DirectUserField[] = [
  { name: "full_name", label: "Nome completo", placeholder: "Nome do colaborador", required: true },
  { name: "email", label: "E-mail", type: "email", placeholder: "colaborador@empresa.com", required: true },
  { name: "password", label: "Senha inicial", type: "password", placeholder: "Mínimo de 8 caracteres", required: true },
  { name: "password_confirmation", label: "Confirmar senha", type: "password", placeholder: "Repita a senha", required: true },
  { name: "employee_number", label: "Matrícula", placeholder: "Matrícula interna" },
  { name: "position", label: "Cargo", placeholder: "Cargo do colaborador" },
  { name: "role", label: "Perfil", placeholder: "employee", required: true },
  { name: "branch_id", label: "Filial", placeholder: "Selecione a filial", ...filial },
  { name: "department_id", label: "Setor", placeholder: "Selecione o setor", ...setor },
  { name: "cost_center_id", label: "Centro de custo", placeholder: "Selecione o centro", ...centro }
];

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

export function DirectUserForm({ title, description, singular }: { title: string; description: string; singular: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string[]>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setErros({});

    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmation = form.get("password_confirmation");
    if (typeof password !== "string" || password.length < 8) {
      setPending(false);
      setMessage("A senha deve possuir pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setPending(false);
      setMessage("As senhas não coincidem.");
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.name === "password_confirmation") continue;
      const raw = form.get(field.name);
      if (typeof raw !== "string" || raw.trim() === "") continue;
      payload[field.name] = raw;
    }
    payload.roles = [payload.role];
    delete payload.role;

    const { data: { session } } = await createBrowserSupabaseClient().auth.getSession();
    if (!session) {
      setPending(false);
      setMessage("Sua sessão expirou. Entre novamente.");
      return;
    }

    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333").replace(/\/$/, "");
      const response = await fetch(`${base}/v1/users`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", "x-tenant-hostname": window.location.hostname },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const corpo: unknown = await response.json();
        setErros(camposInvalidos(corpo));
        throw new Error(mensagemDe(corpo, "Não foi possível cadastrar o usuário."));
      }
      router.push("/admin/usuarios");
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
        <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-primary">Novo cadastro</span>
        <h1 className="mb-1 mt-1.5 text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        <p className="m-0 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </header>

      <form onSubmit={submit} className="grid gap-4">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-panel">
          <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-extrabold text-primary">01</span>
            <div>
              <h2 className="m-0 text-base font-semibold">Dados do {singular}</h2>
              <p className="m-0 mt-0.5 text-xs text-muted-foreground">A senha inicial será entregue pelo administrador ao usuário.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => {
              const invalido = erros[field.name];
              return (
                <label key={field.name} className="grid gap-1.5 text-sm font-semibold">
                  <span>
                    {field.label}
                    {field.required ? <span className="ml-0.5 text-destructive" aria-hidden="true">*</span> : null}
                  </span>
                  {field.source ? (
                    <RelationSelect name={field.name} source={field.source} labelKeys={field.labelKeys ?? ["name", "code"]} placeholder={field.placeholder} required={field.required} />
                  ) : (
                    <input
                      name={field.name}
                      type={field.type ?? "text"}
                      minLength={field.name === "password" || field.name === "password_confirmation" ? 8 : undefined}
                      autoComplete={field.name === "password" || field.name === "password_confirmation" ? "new-password" : field.name === "email" ? "email" : undefined}
                      placeholder={field.placeholder}
                      required={field.required}
                      className={cn("h-11 rounded-lg border bg-surface px-3 text-sm font-normal outline-none focus:border-primary", invalido ? "border-destructive" : "border-border")}
                    />
                  )}
                  {invalido ? <small className="font-normal text-destructive">{invalido.join(" ")}</small> : null}
                </label>
              );
            })}
          </div>
        </section>

        {message ? <p role="alert" className="m-0 rounded-lg border border-destructive/30 bg-tint-rose px-4 py-3 text-sm text-tint-rose-ink">{message}</p> : null}

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 rounded-xl border border-border bg-surface/95 p-3 backdrop-blur">
          <Link href="/admin/usuarios" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted">Cancelar</Link>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? "Salvando…" : "Cadastrar usuário"}
          </button>
        </div>
      </form>
    </div>
  );
}
