interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warning" | "success";
}

export function MetricCard({ label, value, detail, tone = "default" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__head"><span>{label}</span><span aria-hidden="true">↗</span></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
