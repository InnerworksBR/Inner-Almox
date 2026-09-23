import { notFound } from "next/navigation";
import { ModuleDashboard } from "@/components/modules/module-dashboard";
import { ModulePage } from "@/components/modules/module-page";
import { RecordForm } from "@/components/modules/record-form";
import { getModuleDefinition } from "@/lib/module-catalog";
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
  const basePath = path.endsWith("/novo") ? path.slice(0, -5) : path;
  const known = navigationGroups.flatMap((group) => group.items).some((item) => item.href === `/${basePath}`) || basePath === "perfil";
  if (!known) notFound();
  if (path.endsWith("/novo")) return <RecordForm {...getModuleDefinition(path)} />;
  return <ModulePage {...getModuleDefinition(path)} consulta={consulta} />;
}
