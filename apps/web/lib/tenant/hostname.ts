export function normalizeHostname(hostname: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized.length > 253 || /[^a-z0-9.:-]/.test(normalized)) {
    throw new Error("Hostname inválido.");
  }
  return normalized;
}
