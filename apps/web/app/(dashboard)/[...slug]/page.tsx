import { notFound } from "next/navigation";
import { ModuleDashboard } from "@/components/modules/module-dashboard";
import { ModulePage } from "@/components/modules/module-page";
import { RecordForm } from "@/components/modules/record-form";
import { DirectUserForm } from "@/components/modules/direct-user-form";
import { fetchTenantRecord } from "@/lib/api/server";
import { apiEndpointByModule, getModuleDefinition } from "@/lib/module-catalog";
import { basePathForForm } from "@/lib/module-path";
import { navigationGroups } from "@/lib/navigation";
import { consultaDeSearchParams } from "@/lib/query";

interface CatchAllPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CatchAllPage({ params, searchParams }: CatchAllPageProps) {
  const { slug } = await params;
  const consulta = consultaDeSearchParams(await searchParams);
  const path = slug.join("/");
  if (slug.length === 1 && ["patrimonio", "almoxarifado", "frota"].includes(slug[0] ?? "")) return <ModuleDashboard domain={slug[0] as "patrimonio" | "almoxarifado" | "frota"} />;
  const isNew = path.endsWith("/novo");
  const isEdit = path.endsWith("/editar");
  const basePath = isNew ? basePathForForm(slug, "new") : isEdit ? basePathForForm(slug, "edit") : path;
  const known = navigationGroups.flatMap((group) => group.items).some((item) => item.href === `/${basePath}`) || basePath === "perfil";
  if (!known) notFound();
  if (isEdit) {
    const id = slug.at(-2);
    const endpoint = apiEndpointByModule[basePath];
    if (!id || !endpoint) notFound();
    const record = await fetchTenantRecord(`${endpoint}/${id}`);
    if (!record) notFound();
    return <RecordForm {...getModuleDefinition(basePath)} mode="edit" record={record} />;
  }
  if (isNew) {
    if (basePath === "admin/usuarios" && consulta.modo === "direto") {
      return <DirectUserForm title="Cadastrar usuário" description="Crie um acesso ativo sem convite por e-mail." singular="usuário" />;
    }
    return <RecordForm {...getModuleDefinition(basePath)} />;
  }
  return <ModulePage {...getModuleDefinition(path)} consulta={consulta} />;
}
