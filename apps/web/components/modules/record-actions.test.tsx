import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({ auth: { getSession: vi.fn() } })
}));

import { actionHeaders, emitAndDownloadAssetTerm, RecordActions } from "./record-actions";
import * as recordActions from "./record-actions";

interface UploadStatusProps {
  file: File;
  previewUrl: string | null;
  progress: number | null;
  completed: boolean;
}

interface SignedUploadOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  bucket: string;
  path: string;
  uploadToken: string;
  file: File;
  onProgress: (percent: number) => void;
}

interface UploadRequestFake {
  upload: { onprogress: ((event: ProgressEvent) => void) | null };
  status: number;
  url: string;
  method: string;
  headers: Map<string, string>;
  body: FormData | null;
  open(method: string, url: string, async: boolean): void;
  setRequestHeader(name: string, value: string): void;
  send(body: FormData): void;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
}

class FakeUploadRequest implements UploadRequestFake {
  upload = { onprogress: null as UploadRequestFake["upload"]["onprogress"] };
  status = 200;
  url = "";
  method = "";
  headers = new Map<string, string>();
  body: FormData | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  open(method: string, url: string, _async: boolean) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
  }

  send(body: FormData) {
    this.body = body;
    this.upload.onprogress?.({ lengthComputable: true, loaded: 40, total: 100 } as ProgressEvent);
    this.onload?.();
  }
}

describe("RecordActions", () => {
  it("não envia content-type JSON quando a ação não possui corpo", () => {
    expect(actionHeaders("token", "localhost", false)).toEqual({
      authorization: "Bearer token",
      "x-tenant-hostname": "localhost"
    });
    expect(actionHeaders("token", "localhost", true)).toEqual({
      authorization: "Bearer token",
      "x-tenant-hostname": "localhost",
      "content-type": "application/json"
    });
  });

  it("oferece edição para ativos cadastrados", () => {
    const markup = renderToStaticMarkup(
      <RecordActions
        path="patrimonio/ativos"
        record={{ id: "asset-123", internal_code: "ATV-000123" }}
      />
    );

    expect(markup).toContain("Editar");
    expect(markup).toContain("/patrimonio/ativos/asset-123/editar");
  });

  it("baixa o PDF do termo recém-emitido", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: "term-123" }), {
        status: 201,
        headers: { "content-type": "application/json" }
      })
    );
    const download = vi.fn().mockResolvedValue(undefined);

    await emitAndDownloadAssetTerm("movement-123", "delivery", request, download);

    expect(request).toHaveBeenCalledWith(
      "asset-movements/movement-123/terms",
      "POST",
      { term_type: "delivery" }
    );
    expect(download).toHaveBeenCalledWith("asset-terms/term-123/pdf", "termo-term-123.pdf");
  });

  it("permite marcar notificações globais como lidas", () => {
    const markup = renderToStaticMarkup(
      <RecordActions
        path="notificacoes"
        record={{ id: "notification-123", user_id: null, read_at: null }}
      />
    );

    expect(markup).toContain("Marcar como lida");
  });

  it("apresenta a prévia da imagem e o andamento com anúncios acessíveis", () => {
    const UploadStatus = (recordActions as unknown as {
      UploadStatus?: ComponentType<UploadStatusProps>;
    }).UploadStatus;
    expect(UploadStatus).toBeTypeOf("function");
    if (!UploadStatus) return;

    const markup = renderToStaticMarkup(
      <UploadStatus
        file={new File(["imagem"], "frente.png", { type: "image/png" })}
        previewUrl="blob:preview"
        progress={45}
        completed={false}
      />
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('alt="Prévia de frente.png"');
    expect(markup).toContain("<progress");
    expect(markup).toContain('value="45"');
  });

  it("envia o arquivo à URL assinada e repassa os bytes enviados", async () => {
    const upload = (recordActions as unknown as {
      uploadSignedFileWithProgress?: (
        options: SignedUploadOptions,
        createRequest?: () => XMLHttpRequest
      ) => Promise<void>;
    }).uploadSignedFileWithProgress;
    expect(upload).toBeTypeOf("function");
    if (!upload) return;

    const request = new FakeUploadRequest();
    const progress: number[] = [];
    await upload({
      supabaseUrl: "http://supabase.local/",
      supabaseAnonKey: "public-key",
      accessToken: "user-token",
      bucket: "tenant-documents",
      path: "tenants/acme/frente.png",
      uploadToken: "signed-token",
      file: new File(["imagem"], "frente.png", { type: "image/png" }),
      onProgress: (percent) => progress.push(percent)
    }, () => request as unknown as XMLHttpRequest);

    expect(request.method).toBe("PUT");
    expect(new URL(request.url).pathname).toContain("/object/upload/sign/tenant-documents/tenants/acme/frente.png");
    expect(new URL(request.url).searchParams.get("token")).toBe("signed-token");
    expect(request.headers.get("authorization")).toBe("Bearer user-token");
    expect(request.headers.get("apikey")).toBe("public-key");
    expect(request.headers.get("x-upsert")).toBe("false");
    expect(request.body).toBeInstanceOf(FormData);
    expect(request.body?.get("cacheControl")).toBe("3600");
    expect((request.body?.get("") as File | null)?.name).toBe("frente.png");
    expect(progress).toEqual([40]);
  });

  it("informa quando o armazenamento recusa o upload", async () => {
    const upload = (recordActions as unknown as {
      uploadSignedFileWithProgress?: (
        options: SignedUploadOptions,
        createRequest?: () => XMLHttpRequest
      ) => Promise<void>;
    }).uploadSignedFileWithProgress;
    expect(upload).toBeTypeOf("function");
    if (!upload) return;

    const request = new FakeUploadRequest();
    request.status = 413;
    const progress: number[] = [];
    await expect(upload({
      supabaseUrl: "http://supabase.local",
      supabaseAnonKey: "public-key",
      accessToken: "user-token",
      bucket: "tenant-documents",
      path: "tenants/acme/grande.pdf",
      uploadToken: "signed-token",
      file: new File(["arquivo"], "grande.pdf", { type: "application/pdf" }),
      onProgress: (percent) => progress.push(percent)
    }, () => request as unknown as XMLHttpRequest)).rejects.toThrow("Falha ao enviar o arquivo");
    expect(progress).toEqual([40]);
  });
});
