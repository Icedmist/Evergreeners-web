import { cn } from "@/lib/utils";
import React from "react";

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Section({ title, children, className, style }: SectionProps) {
  return (
    <section className={cn("space-y-4", className)} style={style}>
      {title && (
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
