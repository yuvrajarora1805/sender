"use client";

interface UsageChartProps {
  labels: string[];
  values: number[];
}

export default function UsageChart({ labels, values }: UsageChartProps) {
  const maxVal = Math.max(...values, 1);

  if (values.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[#52525b] text-sm">
        No usage data yet.
      </div>
    );
  }

  return (
    <div className="h-[200px] flex items-end gap-2 pt-8">
      {labels.map((label, i) => {
        const pct = Math.max((values[i] / maxVal) * 100, 4);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-default">
            <span
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-white tracking-widest tabular-nums"
              style={{ transform: "translateY(4px)" }}
            >
              {values[i].toLocaleString()}
            </span>
            <div className="w-full relative" style={{ height: `${pct}%`, minHeight: '4px' }}>
              <div
                className="absolute inset-x-0 bottom-0 top-0 rounded-sm transition-all bg-[#262626] group-hover:bg-[#3b82f6]"
              />
            </div>
            <span className="text-[10px] uppercase font-medium tracking-widest text-[#71717a] group-hover:text-white transition-colors">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
