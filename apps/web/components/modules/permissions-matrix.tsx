import { fetchTenantCollection } from "@/lib/api/server";
import { rolePermissions, type PermissionRole } from "@/lib/permissions";

interface RoleCount {
  role: PermissionRole;
  count: number;
}

async function roleCounts(): Promise<{ counts: RoleCount[]; available: boolean }> {
  const counts = new Map<PermissionRole, number>();
  let pagina = 1;
  let carregados = 0;
  let total = 0;
  let available = true;

  do {
    const result = await fetchTenantCollection("users", { pagina: String(pagina), tamanho: "100" });
    available = available && result.available;
    total = result.total;
    for (const user of result.data) {
      const roles = user.roles;
      if (!Array.isArray(roles)) continue;
      for (const role of roles) {
        if (typeof role !== "string" || !(role in rolePermissions)) continue;
        const permissionRole = role as PermissionRole;
        counts.set(permissionRole, (counts.get(permissionRole) ?? 0) + 1);
      }
    }
    carregados += result.data.length;
    if (result.data.length === 0) break;
    pagina += 1;
  } while (carregados < total);

  return {
    available,
    counts: (Object.keys(rolePermissions) as PermissionRole[]).map((role) => ({ role, count: counts.get(role) ?? 0 }))
  };
}

export async function PermissionsMatrix() {
  const result = await roleCounts();

  return (
    <section className="grid gap-4" aria-labelledby="permissions-matrix-title">
      <div className="panel p-5">
        <span className="panel__eyebrow">Acesso do tenant</span>
        <h2 id="permissions-matrix-title" className="mb-1 mt-1 text-xl font-bold">Matriz de permissões</h2>
        <p className="m-0 text-sm text-muted-foreground">Papéis e ações definidos pelo produto. Esta tela é somente para consulta.</p>
      </div>
      {!result.available ? (
        <div role="alert" className="rounded-xl border border-tint-amber-ink/30 bg-tint-amber px-4 py-3 text-sm text-tint-amber-ink">Não foi possível carregar a contagem atual de usuários.</div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {result.counts.map(({ role, count }) => {
          const definition = rolePermissions[role];
          return (
            <article key={role} className="panel grid gap-4 p-5">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{role}</span>
                  <h3 className="mb-1 mt-1 text-base font-bold">{definition.label}</h3>
                  <p className="m-0 text-sm text-muted-foreground">{definition.description}</p>
                </div>
                <strong className="rounded-full bg-muted px-3 py-1 text-lg" aria-label={`${count} usuários`}>{count}</strong>
              </header>
              <div className="grid gap-3">
                {definition.modules.map((permissionModule) => (
                  <div key={permissionModule.key}>
                    <h4 className="mb-1 text-sm font-semibold">{permissionModule.label}</h4>
                    <ul className="m-0 grid gap-1 pl-5 text-sm text-muted-foreground">
                      {permissionModule.actions.map((action) => <li key={action}>{action}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
