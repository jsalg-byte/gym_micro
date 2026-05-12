import React from "react";

interface MetricCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

export function MetricCard({ icon, label, value, subValue, className = "" }: MetricCardProps) {
  return (
    <div className={`bg-surface rounded-app p-5 flex flex-col gap-3 min-w-[140px] ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase font-bold tracking-widest text-muted">{label}</span>
        {icon && <div className="text-accent-pink">{icon}</div>}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-black text-white">{value}</span>
        {subValue && <span className="text-xs text-muted">{subValue}</span>}
      </div>
    </div>
  );
}
