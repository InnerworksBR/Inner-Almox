import { randomUUID } from "node:crypto";

import { AppError } from "../errors/app-error";

const BUCKET = "tenant-documents";

export interface StorageService {
  signUpload(
    tenantId: string,
    entityType: string,
    entityId: string,
    fileName: string,
  ): Promise<{ path: string; token: string }>;
  signDownload(tenantId: string, path: string): Promise<{ signedUrl: string }>;
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function encodeStoragePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export class SupabaseStorageService implements StorageService {
  private readonly storageUrl: string;
  private readonly headers: Record<string, string>;

  constructor(url: string, serviceRoleKey: string) {
    this.storageUrl = `${url.replace(/\/$/, "")}/storage/v1`;
    this.headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };
  }

  async signUpload(tenantId: string, entityType: string, entityId: string, fileName: string) {
    const safeName = fileName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-160);
    const path = `${tenantId}/${entityType}/${entityId}/${randomUUID()}-${safeName}`;
    const response = await fetch(
      `${this.storageUrl}/object/upload/sign/${BUCKET}/${encodeStoragePath(path)}`,
      { method: "POST", headers: this.headers, body: "{}" },
    );
    const payload: unknown = await response.json().catch(() => ({}));
    const relativeUrl = asObject(payload).url;
    if (!response.ok || typeof relativeUrl !== "string") {
      throw new AppError("Não foi possível autorizar o envio.", 500, "SIGNED_UPLOAD_FAILED");
    }
    const token = new URL(`${this.storageUrl}${relativeUrl}`).searchParams.get("token");
    if (!token) {
      throw new AppError("Token de envio não retornado pelo storage.", 500, "SIGNED_UPLOAD_FAILED");
    }
    return { path, token };
  }

  async signDownload(tenantId: string, path: string) {
    if (!path.startsWith(`${tenantId}/`) || path.includes("..")) {
      throw new AppError("Caminho de arquivo inválido.", 403, "INVALID_STORAGE_PATH");
    }
    const response = await fetch(
      `${this.storageUrl}/object/sign/${BUCKET}/${encodeStoragePath(path)}`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ expiresIn: 300 }),
      },
    );
    const payload: unknown = await response.json().catch(() => ({}));
    const body = asObject(payload);
    const relativeUrl = body.signedURL ?? body.signedUrl;
    if (!response.ok || typeof relativeUrl !== "string") {
      throw new AppError("Não foi possível autorizar o download.", 500, "SIGNED_DOWNLOAD_FAILED");
    }
    return {
      signedUrl: relativeUrl.startsWith("http")
        ? relativeUrl
        : `${this.storageUrl}${relativeUrl}`,
    };
  }
}

export class UnconfiguredStorageService implements StorageService {
  signUpload(): Promise<{ path: string; token: string }> {
    throw new AppError("Storage não configurado.", 503, "STORAGE_UNCONFIGURED");
  }

  signDownload(): Promise<{ signedUrl: string }> {
    throw new AppError("Storage não configurado.", 503, "STORAGE_UNCONFIGURED");
  }
}
