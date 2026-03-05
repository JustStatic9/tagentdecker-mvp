import React from "react";

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Section({ className = "", children, ...props }: SectionProps) {
  return (
    <section className={`py-12 ${className}`} {...props}>
      {children}
    </section>
  );
}
