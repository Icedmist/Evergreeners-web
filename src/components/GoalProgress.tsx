import { Target } from "lucide-react";

interface GoalProgressProps {
  title: string;
  current: number;
  target: number;
}

export function GoalProgress({ title, current, target }: GoalProgressProps) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {current}/{target}
        </span>
      </div>
      
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
