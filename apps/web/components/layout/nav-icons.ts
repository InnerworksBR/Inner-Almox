import {
  Activity, ArrowLeftRight, BadgeCheck, Bell, Boxes, Building2, Car, CalendarClock, CircleAlert,
  CirclePlus, ClipboardCheck, ClipboardList, FileClock, FileSignature, FileText, Fuel, Globe,
  Handshake, IdCard, KeyRound, Layers, LayoutDashboard, ListChecks, LogIn, LogOut, MapPin, Network,
  Package, PackageMinus, PackagePlus, Receipt, ChartPie, ScrollText, Settings, ShieldCheck,
  Tags, TriangleAlert, Truck, Users, Wallet, Warehouse, Wrench, type LucideIcon
} from "lucide-react";

/** Ícone de cada item do menu, pela rota. */
export const iconByHref: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/notificacoes": Bell,
  "/meus-ativos": Package,
  "/solicitar-material": CirclePlus,
  "/minhas-requisicoes": ClipboardList,
  "/meus-termos": FileSignature,
  "/patrimonio": ChartPie,
  "/patrimonio/ativos": Boxes,
  "/patrimonio/categorias": Tags,
  "/patrimonio/movimentacoes": ArrowLeftRight,
  "/patrimonio/inventarios": ClipboardCheck,
  "/patrimonio/garantias": ShieldCheck,
  "/patrimonio/manutencoes": Wrench,
  "/patrimonio/relatorios": FileText,
  "/almoxarifado": ChartPie,
  "/almoxarifado/produtos": Package,
  "/almoxarifado/entradas": PackagePlus,
  "/almoxarifado/saidas": PackageMinus,
  "/almoxarifado/transferencias": ArrowLeftRight,
  "/almoxarifado/requisicoes": ClipboardList,
  "/almoxarifado/lotes": Layers,
  "/almoxarifado/inventarios": ClipboardCheck,
  "/almoxarifado/relatorios": FileText,
  "/frota": ChartPie,
  "/frota/veiculos": Car,
  "/frota/motoristas": IdCard,
  "/frota/reservas": CalendarClock,
  "/frota/retiradas": LogOut,
  "/frota/devolucoes": LogIn,
  "/frota/abastecimentos": Fuel,
  "/frota/despesas": Receipt,
  "/frota/multas": TriangleAlert,
  "/frota/ocorrencias": CircleAlert,
  "/frota/relatorios": FileText,
  "/admin/usuarios": Users,
  "/admin/filiais": Building2,
  "/admin/setores": Network,
  "/admin/centros-de-custo": Wallet,
  "/admin/localizacoes": MapPin,
  "/admin/fornecedores": Handshake,
  "/admin/permissoes": KeyRound,
  "/admin/configuracoes": Settings,
  "/admin/auditoria": ScrollText,
  "/superadmin/tenants": Building2,
  "/superadmin/dominios": Globe,
  "/superadmin/planos": BadgeCheck,
  "/superadmin/modulos": Layers,
  "/superadmin/saude": Activity,
  "/superadmin/jobs": ListChecks,
  "/superadmin/logs": FileClock
};

/** Ícone de cada grupo do menu, pelo rótulo. */
export const iconByGroup: Record<string, LucideIcon> = {
  "Visão geral": LayoutDashboard,
  "Meu espaço": Package,
  "Patrimônio": Boxes,
  "Almoxarifado": Warehouse,
  "Frota": Truck,
  "Administração": Settings,
  "InnerWorks": Globe
};

export const fallbackIcon = ChartPie;
