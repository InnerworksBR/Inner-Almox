"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Bell, ChevronDown, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from "lucide-react";
import { cn } from "cn";

import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { navigationGroups } from "@/lib/navigation";
import { fallbackIcon, iconByGroup, iconByHref } from "@/components/layout/nav-icons";

interface AppShellProps {
  children: ReactNode;
  userEmail: string;
  userName?: string | null;
  roles: string[];
  unreadCount?: number;
  brand: { companyName: string; productName: string; logoPath?: string | null; primaryColor?: string | null; secondaryColor?: string | null };
}

type BrandStyle = CSSProperties & { "--primary"?: string; "--lime"?: string };

const CHAVE_GRUPOS = "inner-almox:sidebar-groups";
const CHAVE_RECOLHIDA = "inner-almox:sidebar-collapsed";
const CHAVE_TEMA = "inner-almox:theme";

const rotuloPorPapel: Record<string, string> = {
  tenant_admin: "Administrador",
  asset_manager: "Gestor de patrimônio",
  warehouse_manager: "Almoxarife",
  fleet_manager: "Gestor de frota",
  maintenance_manager: "Gestor de manutenção",
  department_manager: "Gestor de setor",
  employee: "Colaborador",
  auditor: "Auditor",
  platform_superadmin: "Superadministrador"
};

const todosOsDestinos = navigationGroups.flatMap((grupo) => grupo.items.map((item) => item.href));

/**
 * Um item só herda o destaque das rotas filhas quando não existe item próprio para
 * elas. Sem isso, "/patrimonio" ficaria aceso junto de "/patrimonio/ativos".
 */
function isCurrentPath(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  const ehPaiDeOutroItem = todosOsDestinos.some((destino) => destino !== href && destino.startsWith(`${href}/`));
  return !ehPaiDeOutroItem && pathname.startsWith(`${href}/`);
}

function canSeeGroup(group: string, roles: string[]): boolean {
  if (group === "InnerWorks") return roles.includes("platform_superadmin");
  if (group === "Administração") return roles.includes("tenant_admin") || roles.includes("auditor");
  if (group === "Patrimônio") return roles.some((role) => ["tenant_admin", "asset_manager", "maintenance_manager", "auditor"].includes(role));
  if (group === "Almoxarifado") return roles.some((role) => ["tenant_admin", "warehouse_manager", "department_manager", "auditor"].includes(role));
  if (group === "Frota") return roles.some((role) => ["tenant_admin", "fleet_manager", "employee", "auditor"].includes(role));
  return true;
}

function iniciais(valor: string): string {
  const partes = valor.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
  const texto = partes.length > 1 ? `${partes[0]?.[0] ?? ""}${partes[1]?.[0] ?? ""}` : valor.slice(0, 2);
  return texto.toUpperCase();
}

export function AppShell({ children, userEmail, userName, roles, unreadCount = 0, brand }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recolhida, setRecolhida] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<string[] | null>(null);
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    try {
      const grupos = window.localStorage.getItem(CHAVE_GRUPOS);
      if (grupos) {
        const lido: unknown = JSON.parse(grupos);
        if (Array.isArray(lido)) setGruposAbertos(lido.filter((item): item is string => typeof item === "string"));
      }
      setRecolhida(window.localStorage.getItem(CHAVE_RECOLHIDA) === "1");
    } catch {
      // Preferências são um conforto: se o navegador bloquear, seguimos no padrão.
    }
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  const visiveis = navigationGroups.filter((grupo) => canSeeGroup(grupo.label, roles));
  const grupoAtivo = visiveis.find((grupo) => grupo.items.some((item) => isCurrentPath(pathname, item.href)))?.label;
  const estaAberto = (label: string) => (gruposAbertos ? gruposAbertos.includes(label) : label === grupoAtivo);

  function alternarGrupo(label: string) {
    const atuais = gruposAbertos ?? (grupoAtivo ? [grupoAtivo] : []);
    const proximos = atuais.includes(label) ? atuais.filter((item) => item !== label) : [...atuais, label];
    setGruposAbertos(proximos);
    try { window.localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(proximos)); } catch { /* preferência opcional */ }
  }

  function alternarRecolhida() {
    const proximo = !recolhida;
    setRecolhida(proximo);
    try { window.localStorage.setItem(CHAVE_RECOLHIDA, proximo ? "1" : "0"); } catch { /* preferência opcional */ }
  }

  function alternarTema() {
    const proximo = !escuro;
    setEscuro(proximo);
    document.documentElement.classList.toggle("dark", proximo);
    try { window.localStorage.setItem(CHAVE_TEMA, proximo ? "dark" : "light"); } catch { /* preferência opcional */ }
  }

  // Recolher vale só no desktop: na gaveta do celular a navegação sempre mostra os rótulos.
  const compacta = recolhida && !mobileOpen;
  const style: BrandStyle = { "--primary": brand.primaryColor ?? undefined, "--lime": brand.secondaryColor ?? undefined };
  const logoPath = brand.logoPath?.startsWith("/") ? brand.logoPath : "/brand/innerworks-logo.png";
  const nomeExibido = userName?.trim() || userEmail.split("@")[0] || "Usuário";
  const papelPrincipal = rotuloPorPapel[roles.find((role) => rotuloPorPapel[role]) ?? ""] ?? "Sem perfil";

  return (
    <div className="min-h-screen bg-background text-foreground" style={style}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-200",
          compacta ? "w-[76px]" : "w-[272px]",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Navegação principal"
      >
        <div className={cn("flex h-[70px] shrink-0 items-center border-b border-border px-4", compacta && "justify-center px-2")}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            {compacta ? (
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-extrabold text-white">
                {brand.productName.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <Image src={logoPath} alt={brand.companyName} width={2000} height={787} className="h-9 w-auto object-contain" priority />
            )}
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" className="ml-auto grid size-9 place-items-center rounded-lg bg-transparent p-0 text-muted-foreground hover:bg-muted lg:hidden">
            <X className="size-4" />
          </button>
        </div>

        {!compacta ? (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-extrabold text-white">
              {brand.productName.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[0.82rem] leading-tight">{brand.productName}</strong>
              <small className="block truncate text-[0.68rem] text-muted-foreground">{brand.companyName}</small>
            </span>
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {visiveis.map((grupo) => {
            const GroupIcon = iconByGroup[grupo.label] ?? fallbackIcon;
            const aberto = estaAberto(grupo.label);
            return (
              <div key={grupo.label} className={cn("mb-1", compacta && "mb-2 border-b border-border pb-2 last:border-0")}>
                {!compacta ? (
                  <button
                    type="button"
                    onClick={() => alternarGrupo(grupo.label)}
                    aria-expanded={aberto}
                    className="flex w-full items-center gap-2 rounded-lg bg-transparent px-2 py-2 text-left text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <GroupIcon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">{grupo.label}</span>
                    <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", aberto && "rotate-180")} aria-hidden="true" />
                  </button>
                ) : null}

                {aberto || compacta ? (
                  <div className={cn("mt-0.5 space-y-0.5", !compacta && "pl-1")}>
                    {grupo.items.map((item) => {
                      const Icon = iconByHref[item.href] ?? fallbackIcon;
                      const ativo = isCurrentPath(pathname, item.href);
                      const mostraBadge = item.href === "/notificacoes" && unreadCount > 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          title={compacta ? item.label : undefined}
                          aria-current={ativo ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.84rem] no-underline transition-colors",
                            ativo ? "bg-primary font-semibold text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            compacta && "justify-center px-0"
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          {!compacta ? <span className="flex-1 truncate">{item.label}</span> : null}
                          {mostraBadge && !compacta ? (
                            <span className="grid min-w-5 place-items-center rounded-full bg-lime px-1.5 text-[0.62rem] font-extrabold text-[#26320b]">{unreadCount}</span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className={cn("flex shrink-0 items-center gap-2 border-t border-border p-3", compacta && "justify-center")}>
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-lime text-[0.7rem] font-extrabold text-[#26320b]">{iniciais(nomeExibido)}</AvatarFallback>
          </Avatar>
          {!compacta ? (
            <>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[0.78rem] capitalize leading-tight">{nomeExibido}</strong>
                <small className="block truncate text-[0.66rem] text-muted-foreground">{papelPrincipal}</small>
              </span>
              <LogoutButton />
            </>
          ) : null}
        </div>
      </aside>

      {mobileOpen ? (
        <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/50 p-0 lg:hidden" />
      ) : null}

      <div className={cn("min-h-screen transition-[padding] duration-200", recolhida ? "lg:pl-[76px]" : "lg:pl-[272px]")}>
        <header className="sticky top-0 z-20 flex h-[70px] items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-transparent p-0 text-foreground lg:hidden">
            <Menu className="size-4" />
          </button>
          <button type="button" onClick={alternarRecolhida} aria-label={recolhida ? "Expandir menu" : "Recolher menu"} className="hidden size-9 shrink-0 place-items-center rounded-lg border border-border bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground lg:grid">
            {recolhida ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>

          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-transparent bg-surface-muted px-3 focus-within:border-primary md:max-w-md">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              aria-label="Pesquisar no sistema"
              placeholder="Pesquisar ativos, produtos, veículos…"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[0.62rem] text-muted-foreground lg:inline">Ctrl K</kbd>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button type="button" onClick={alternarTema} aria-label={escuro ? "Usar tema claro" : "Usar tema escuro"} className="grid size-9 place-items-center rounded-full border border-border bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground">
              {escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link href="/notificacoes" aria-label={`Notificações${unreadCount > 0 ? `: ${unreadCount} não lidas` : ""}`} className="relative grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary">
              <Bell className="size-4" />
              {unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.58rem] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border py-0.5 pl-0.5 pr-2 text-sm transition-colors hover:bg-muted">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary-soft text-[0.68rem] font-bold text-primary">{iniciais(nomeExibido)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate font-semibold md:inline">{nomeExibido}</span>
                <ChevronDown className="hidden size-3.5 text-muted-foreground md:inline" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{nomeExibido}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{userEmail}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/perfil">Minha conta</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/notificacoes">Notificações</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><LogoutButton variant="item" /></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] px-4 pb-16 pt-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
