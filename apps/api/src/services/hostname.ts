import { isIP } from "node:net";
import { AppError } from "../errors/app-error";

export function normalizeHostname(rawHostname: string): string {
  const raw = rawHostname.trim().toLowerCase();
  if (!raw || raw.includes("/") || raw.includes("\\") || raw.includes("@")) {
    throw new AppError("Hostname inválido.", 400, "INVALID_HOSTNAME");
  }

  let hostname: string;
  try {
    hostname = new URL(`http://${raw}`).hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  } catch {
    throw new AppError("Hostname inválido.", 400, "INVALID_HOSTNAME");
  }

  const isDomain = hostname.length <= 253 && /^[a-z0-9.-]+$/.test(hostname);
  if (!isDomain && isIP(hostname) === 0) {
    throw new AppError("Hostname inválido.", 400, "INVALID_HOSTNAME");
  }
  return hostname;
}
