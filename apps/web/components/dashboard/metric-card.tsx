import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

export type MetricTint = "emerald" | "lime" | "sky" | "amber" | "rose" | "violet";

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  icon?: LucideIcon;
  tint?: MetricTint;
  href?: string;
}

// Classes escritas por extenso para que o Tailwind as encontre na varredura.
const tints: Record<MetricTint, { surface: string; ink: string }> = {
  emerald: { surface: "bg-tint-emerald", ink: "text-tint-emerald-ink" },
  lime: { surface: "bg-tint-lime", ink: "text-tint-lime-ink" },
  sky: { surface: "bg-tint-sky", ink: "text-tint-sky-ink" },
  amber: { surface: "bg-tint-amber", ink: "text-tint-amber-ink" },
  rose: { surface: "bg-tint-rose", ink: "text-tint-rose-ink" },
  violet: { surface: "bg-tint-violet", ink: "text-tint-violet-ink" }
};

export function MetricCard({ label, value, detail, icon: Icon, tint = "emerald", href }: MetricCardProps) {
  const paleta = tints[tint];
  const conteudo = (
    <>
      {Icon ? (
        <span className={cn("grid size-11 place-items-center rounded-xl bg-surface/70", paleta.ink)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <span className={cn("mt-3 block text-[0.78rem] font-semibold", paleta.ink)}>{label}</span>
      <strong className={cn("mt-1 block text-[1.75rem] font-bold leading-tight tracking-tight", paleta.ink)}>{value}</strong>
      {detail ? <small className="mt-1 block text-[0.7rem] text-muted-foreground">{detail}</small> : null}
    </>
  );

  const classes = cn(
    "block rounded-2xl p-4 no-underline transition-transform",
    paleta.surface,
    href && "hover:-translate-y-0.5"
  );

  return href ? <Link href={href} className={classes}>{conteudo}</Link> : <article className={classes}>{conteudo}</article>;
}
