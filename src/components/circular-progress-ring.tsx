import React from "react";

interface CircularProgressRingProps {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
}

export function CircularProgressRing({
  percentage,
  color,
  size = 200,
  strokeWidth = 12,
  label,
  subLabel,
}: CircularProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {(label || subLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label && <span className="text-3xl font-bold text-white">{label}</span>}
          {subLabel && <span className="text-xs text-muted mt-1 uppercase tracking-wider">{subLabel}</span>}
        </div>
      )}
    </div>
  );
}
