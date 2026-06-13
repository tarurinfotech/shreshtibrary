import clsx from "clsx";
import { Button } from "./Button";

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-wrap gap-2", className)} role="tablist">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "primary" : "secondary"}
          aria-selected={value === option.value}
          role="tab"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
