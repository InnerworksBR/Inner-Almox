export function basePathForForm(slug: readonly string[], mode: "new" | "edit"): string {
  return slug.slice(0, mode === "edit" ? -2 : -1).join("/");
}
