"use client";

import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface ReportDefinition {
  domain: "assets" | "asset-movements" | "stock" | "stock-movements" | "fleet" | "fuelings";
  name: string;
  description: string;
}

const reportsByPath: Record<string, ReportDefinition[]> = {
  "patrimonio/relatorios": [
    { domain: "assets", name: "Cadastro de ativos", description: "Posição atual, responsáveis, localizações e situação." },
    { domain: "asset-movements", name: "Movimentações patrimoniais", description: "Histórico auditável de entregas, devoluções e transferências." }
  ],
  "almoxarifado/relatorios": [
    { domain: "stock", name: "Posição de estoque", description: "Saldos, mínimos e distribuição por localização." },
    { domain: "stock-movements", name: "Movimentações de estoque", description: "Entradas, saídas, ajustes e transferências." }
  ],
  "frota/relatorios": [
    { domain: "fleet", name: "Cadastro da frota", description: "Veículos, disponibilidade, documentos e quilometragem." },
    { domain: "fuelings", name: "Abastecimentos", description: "Volume, custo, quilometragem e consumo registrado." }
  ]
};

export function ReportCenter({ path }: { path: string }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function download(report: ReportDefinition, format: "csv" | "xlsx") {
    const operation = `${report.domain}-${format}`;
    setBusy(operation);
    setMessage("");
    try {
      const { data: { session } } = await createBrowserSupabaseClient().auth.getSession();
      if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
      const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333").replace(/\/$/, "");
      const response = await fetch(`${base}/v1/reports/${report.domain}?format=${format}`, {
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "x-tenant-hostname": window.location.hostname
        }
      });
      if (!response.ok) throw new Error("Não foi possível gerar o relatório.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.domain}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Falha ao gerar o relatório.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="report-grid">
      {(reportsByPath[path] ?? []).map((report) => (
        <article className="panel report-card" key={report.domain}>
          <div><span className="panel__eyebrow">Exportação</span><h2>{report.name}</h2><p>{report.description}</p></div>
          <div className="report-actions">
            <button className="button button--secondary" type="button" disabled={Boolean(busy)} onClick={() => void download(report, "csv")}>{busy === `${report.domain}-csv` ? "Gerando…" : "Baixar CSV"}</button>
            <button className="button" type="button" disabled={Boolean(busy)} onClick={() => void download(report, "xlsx")}>{busy === `${report.domain}-xlsx` ? "Gerando…" : "Baixar XLSX"}</button>
          </div>
        </article>
      ))}
      {message ? <p className="message" role="alert">{message}</p> : null}
    </section>
  );
}
