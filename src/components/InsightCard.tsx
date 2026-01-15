import { Lightbulb } from "lucide-react";

interface InsightCardProps {
  text: string;
}

export function InsightCard({ text }: InsightCardProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/30">
      <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
