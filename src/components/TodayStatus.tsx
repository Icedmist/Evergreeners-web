import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodayStatusProps {
  active: boolean;
  commits: number;
  lastActivity?: string;
}

export function TodayStatus({ active, commits, lastActivity }: TodayStatusProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-4 rounded-xl border",
      active ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/50"
    )}>
      {active ? (
        <CheckCircle2 className="w-5 h-5 text-primary" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground" />
      )}

      <div className="flex-1">
        <p className={cn(
          "font-medium",
          active ? "text-foreground" : "text-muted-foreground"
        )}>
          {active ? "You're active today" : "No activity yet"}
        </p>
        {active && (
          <p className="text-sm text-muted-foreground">
            {commits} commit{commits !== 1 ? "s" : ""} • Last: {lastActivity}
          </p>
        )}
      </div>
    </div>
  );
}
