"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MonthlySeriesPoint {
  month: string;
  label: string;
  values: Record<string, number>;
}

interface MonthlyBarChartProps {
  data: MonthlySeriesPoint[];
  series: Array<{ key: string; label: string; color: string }>;
}

export function MonthlyBarChart({ data, series }: MonthlyBarChartProps) {
  const chartData: Array<Record<string, string | number>> = data.map((point) => ({
    month: point.month,
    label: point.label,
    ...Object.fromEntries(series.map(({ key }) => [key, point.values[key] ?? 0]))
  }));
  const hasValue = chartData.some((point) => series.some(({ key }) => Number(point[key]) > 0));

  if (!hasValue) {
    return (
      <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-center">
        <p className="m-0 max-w-xs text-sm text-muted-foreground">Ainda não há movimentações no período.</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full" aria-label="Gráfico mensal">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((item) => <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} radius={[4, 4, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
