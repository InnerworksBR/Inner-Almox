import { cn } from "cn";
import { descreverStatus, type TomStatus } from "@/lib/status";

const tons: Record<TomStatus, string> = {
  positivo: "bg-tint-emerald text-tint-emerald-ink",
  info: "bg-tint-sky text-tint-sky-ink",
  atencao: "bg-tint-amber text-tint-amber-ink",
  critico: "bg-tint-rose text-tint-rose-ink",
  neutro: "bg-muted text-muted-foreground"
};

export function StatusBadge({ valor, className }: { valor: unknown; className?: string }) {
  const descricao = descreverStatus(valor);
  if (!descricao) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-bold whitespace-nowrap", tons[descricao.tom], className)}>
      {descricao.rotulo}
    </span>
  );
}
