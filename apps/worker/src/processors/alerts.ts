import type { Job } from "bullmq";
import type { AlertRefreshJobInput } from "../queues/alerts";
import { ALERT_REFRESH_QUEUE } from "../queues/alerts";
import type { NotificationJobInput } from "../queues/notifications";
import type { JobRegistry } from "../services/job-registry";

type Row = Record<string, unknown>;
type AlertRefreshJob = Pick<Job<AlertRefreshJobInput>, "id" | "data" | "attemptsMade">;

function rowFromUnknown(value: unknown): Row | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Row;
}

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function textFromRow(row: Row, key: string, fallback: string): string {
  const value = row[key];
  return typeof value === "string" && value ? value : fallback;
}

export function createAlertRefreshProcessor(config: {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  jobRegistry?: Pick<JobRegistry, "recordTenantScan">;
  publishNotification?: (input: NotificationJobInput) => Promise<string>;
}) {
  return async function processAlerts(job: AlertRefreshJob) {
    if (!config.supabaseUrl || !config.serviceRoleKey) throw new Error("Supabase do worker não configurado.");

    const base = config.supabaseUrl.replace(/\/+$/, "");
    const headers = {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json"
    };
    const response = await fetch(`${base}/rest/v1/tenants?status=eq.active&select=id`, { headers });
    if (!response.ok) throw new Error("Falha ao consultar tenants para alertas.");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta inválida ao consultar tenants.");

    let notifications = 0;
    for (const value of data) {
      const row = rowFromUnknown(value);
      if (typeof row?.id !== "string") continue;

      const tenantId = row.id;
      const externalJobId = `${String(job.id)}:${tenantId}`;
      try {
        const refresh = await fetch(`${base}/rest/v1/rpc/refresh_tenant_alerts`, {
          method: "POST",
          headers,
          body: JSON.stringify({ target_tenant_id: tenantId, actor_user_id: null })
        });
        if (!refresh.ok) throw new Error(`Falha ao atualizar alertas do tenant ${tenantId}.`);
        const count: unknown = await refresh.json();
        const tenantNotifications = typeof count === "number" ? count : 0;
        notifications += tenantNotifications;

        const pendingResponse = await fetch(`${base}/rest/v1/rpc/pending_alert_emails`, {
          method: "POST",
          headers,
          body: JSON.stringify({ target_tenant_id: tenantId })
        });
        if (!pendingResponse.ok) throw new Error(`Falha ao consultar e-mails pendentes do tenant ${tenantId}.`);
        const pending: unknown = await pendingResponse.json();
        if (!Array.isArray(pending)) throw new Error("Resposta inválida de e-mails pendentes.");
        if (pending.length > 0 && !config.publishNotification) throw new Error("Publisher de e-mail do worker não configurado.");
        for (const pendingValue of pending) {
          const pendingRow = rowFromUnknown(pendingValue);
          const recipientEmail = pendingRow?.recipient_email;
          if (typeof recipientEmail !== "string" || !recipientEmail) throw new Error("Destinatário do e-mail pendente não informado.");
          const userId = typeof pendingRow.user_id === "string" ? pendingRow.user_id : undefined;
          const type = textFromRow(pendingRow, "type", "alert");
          const title = textFromRow(pendingRow, "subject", textFromRow(pendingRow, "title", "Alerta operacional"));
          const message = textFromRow(pendingRow, "body", textFromRow(pendingRow, "message", "Há um alerta operacional pendente."));
          await config.publishNotification!({
            tenantId,
            userId,
            recipientEmail,
            type,
            title,
            message,
            entityType: typeof pendingRow.entity_type === "string" ? pendingRow.entity_type : undefined,
            entityId: typeof pendingRow.entity_id === "string" ? pendingRow.entity_id : undefined,
            channel: "email"
          });
        }

        await config.jobRegistry?.recordTenantScan({
          queue: ALERT_REFRESH_QUEUE,
          type: "refresh-tenant-alerts",
          externalJobId,
          tenantId,
          attempts: job.attemptsMade + 1,
          payload: job.data,
          status: "completed",
          result: { notifications: tenantNotifications }
        });
      } catch (error) {
        try {
          await config.jobRegistry?.recordTenantScan({
            queue: ALERT_REFRESH_QUEUE,
            type: "refresh-tenant-alerts",
            externalJobId,
            tenantId,
            attempts: job.attemptsMade + 1,
            payload: job.data,
            status: "failed",
            errorMessage: messageFromUnknown(error)
          });
        } catch (registryError) {
          console.error(JSON.stringify({
            event: "tenant_scan_registry_error",
            tenantId,
            error: messageFromUnknown(registryError)
          }));
        }
        throw error;
      }
    }

    return { tenants: data.length, notifications };
  };
}
