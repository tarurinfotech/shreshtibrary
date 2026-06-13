import { SectionCard } from "./SectionCard";

export function ChartCard({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SectionCard title={<span className="text-lg font-bold tracking-normal">{title}</span>} actions={actions} className={className} padding="lg" menu>
      {children}
    </SectionCard>
  );
}
