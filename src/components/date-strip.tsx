import React from "react";

interface DateStripProps {
  activeDate: Date;
  onDateChange?: (date: Date) => void;
}

export function DateStrip({ activeDate, onDateChange }: DateStripProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Generate a week around the active date for demo purposes
  const getWeekDates = () => {
    const dates = [];
    const curr = new Date(activeDate);
    const first = curr.getDate() - curr.getDay() + 1; // Mon
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.setDate(first + i));
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  return (
    <div className="flex justify-between w-full py-4">
      {weekDates.map((date, i) => {
        const isActive = date.toDateString() === activeDate.toDateString();
        const hasActivity = i === 2 || i === 5; // Dummy data for activity dots/indicators

        return (
          <button
            key={i}
            onClick={() => onDateChange?.(date)}
            className="flex flex-col items-center gap-2 outline-none group"
          >
            <span className="text-[10px] uppercase font-medium text-muted">{days[i]}</span>
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${
                  isActive
                    ? "bg-transparent border-2 border-accent-pink text-white"
                    : "text-white group-hover:bg-white/5"
                }
              `}
            >
              {date.getDate()}
            </div>
            {hasActivity && <div className="w-1.5 h-1.5 rounded-full bg-accent-pink/50" />}
          </button>
        );
      })}
    </div>
  );
}
