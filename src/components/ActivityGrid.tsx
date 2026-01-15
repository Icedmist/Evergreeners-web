import { cn } from "@/lib/utils";

interface ActivityGridProps {
  data: number[]; // 0-4 scale for intensity
}

export function ActivityGrid({ data }: ActivityGridProps) {
  const getIntensityClass = (value: number) => {
    switch (value) {
      case 0:
        return "bg-secondary";
      case 1:
        return "bg-primary/25";
      case 2:
        return "bg-primary/50";
      case 3:
        return "bg-primary/75";
      case 4:
        return "bg-primary";
      default:
        return "bg-secondary";
    }
  };

  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={cn(
                  "w-3 h-3 rounded-sm transition-colors",
                  getIntensityClass(day)
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
