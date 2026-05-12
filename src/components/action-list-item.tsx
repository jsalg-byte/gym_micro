import React from "react";
import Image from "next/image";

interface ActionListItemProps {
  title: string;
  subtitle: string;
  image?: string;
  isCompleted?: boolean;
  onToggle?: () => void;
  onReplace?: () => void;
  onPlay?: () => void;
  type?: "workout" | "meal";
  duration?: string;
  kcal?: string;
}

export function ActionListItem({
  title,
  subtitle,
  image,
  isCompleted = false,
  onToggle,
  onReplace,
  onPlay,
  type = "workout",
  duration,
  kcal,
}: ActionListItemProps) {
  return (
    <div className="bg-surface rounded-app p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className={`
              mt-1 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
              ${isCompleted ? "bg-accent-pink border-accent-pink" : "border-muted/30 bg-transparent"}
            `}
          >
            {isCompleted && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[10px] text-muted font-medium mb-1">
              {duration && <span>{duration}</span>}
              {duration && kcal && <span>•</span>}
              {kcal && <span>{kcal}</span>}
            </div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        
        {image && (
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white/5">
            <Image src={image} alt={title} width={80} height={80} className="w-full h-full object-cover" />
            {isCompleted && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white uppercase bg-black/60 px-2 py-1 rounded">Completed</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReplace}
          className="flex-1 bg-line hover:bg-white/10 text-white text-xs font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Replace
        </button>
        <button
          onClick={onPlay}
          className="flex-1 bg-accent-pink hover:bg-accent-pink/90 text-white text-xs font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {type === "workout" ? "Play" : "Receipt"}
        </button>
      </div>
    </div>
  );
}
