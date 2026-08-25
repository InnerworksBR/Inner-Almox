"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { navigationGroups } from "@/lib/navigation";

interface AppShellProps {
  children: ReactNode;
  userEmail: string;
  roles: string[];
  brand: { companyName:string; productName:string; logoPath?:string|null; primaryColor?:string|null; secondaryColor?:string|null };
}

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type BrandStyle = CSSProperties & { "--primary"?:string; "--lime"?:string };

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
  );
}

export function AppShell({ children, userEmail, roles, brand }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const style:BrandStyle={"--primary":brand.primaryColor??undefined,"--lime":brand.secondaryColor??undefined};
  const logoPath=brand.logoPath?.startsWith("/")?brand.logoPath:"/brand/innerworks-logo.png";

  return (
    <div className="app-shell" style={style}>
      <aside className={menuOpen ? "sidebar sidebar--open" : "sidebar"} aria-label="Navegação principal">
        <div className="sidebar__brand">
          <Image src={logoPath} alt={brand.companyName} width={2000} height={787} className="sidebar__logo" priority />
          <button className="icon-button sidebar__close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><CloseIcon /></button>
        </div>
        <div className="tenant-switcher">
          <span className="tenant-switcher__avatar">{brand.productName.slice(0,2).toUpperCase()}</span>
          <span><strong>{brand.productName}</strong><small>{brand.companyName}</small></span>
          <span aria-hidden="true">⌄</span>
        </div>
        <nav className="sidebar__nav">
          {navigationGroups.filter((group)=>canSeeGroup(group.label,roles)).map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group__label">{group.label}</p>
              {group.items.map((item) => (
                <Link href={item.href} key={item.href} className={isCurrentPath(pathname, item.href) ? "nav-link nav-link--active" : "nav-link"} onClick={() => setMenuOpen(false)}>
                  <span className="nav-link__marker" aria-hidden="true">{item.marker}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className="user-avatar">{userEmail.slice(0, 2).toUpperCase()}</span>
          <span className="sidebar__user"><strong>{userEmail.split("@")[0]}</strong><small>{userEmail}</small></span>
          <LogoutButton compact />
        </div>
      </aside>
      {menuOpen ? <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> : null}
      <div className="app-canvas">
        <header className="topbar">
          <button className="icon-button topbar__menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">☰</button>
          <div className="global-search" role="search">
            <span aria-hidden="true">⌕</span>
            <input aria-label="Pesquisar no sistema" placeholder="Pesquisar ativos, produtos, veículos…" />
            <kbd>Ctrl K</kbd>
          </div>
          <div className="topbar__actions">
            <Link className="icon-button notification-button" href="/notificacoes" aria-label="Notificações"><BellIcon /></Link>
            <Link className="user-chip" href="/perfil"><span>{userEmail.slice(0, 2).toUpperCase()}</span><span className="user-chip__copy">Minha conta</span></Link>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

function canSeeGroup(group:string,roles:string[]):boolean{
  if(group==="InnerWorks")return roles.includes("platform_superadmin");
  if(group==="Administração")return roles.includes("tenant_admin")||roles.includes("auditor");
  if(group==="Patrimônio")return roles.some(role=>["tenant_admin","asset_manager","maintenance_manager","auditor"].includes(role));
  if(group==="Almoxarifado")return roles.some(role=>["tenant_admin","warehouse_manager","department_manager","auditor"].includes(role));
  if(group==="Frota")return roles.some(role=>["tenant_admin","fleet_manager","employee","auditor"].includes(role));
  return true;
}
