interface StatItemProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export function StatItem({ label, value, subtext }: StatItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-semibold text-foreground mt-1">
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-muted-foreground mt-0.5">
          {subtext}
        </span>
      )}
    </div>
  );
}
