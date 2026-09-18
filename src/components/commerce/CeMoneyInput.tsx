import { Input } from "@/components/ui/input";
import { formatCeAmountDisplay, parseCeAmountInput } from "@/lib/ceMoneyInput";
import { cn } from "@/lib/utils";

/** Champ montant avec séparateurs de milliers FR (stockage = digits bruts). */
export function CeMoneyInput({
  value,
  onChange,
  className,
  placeholder = "0",
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (raw: string) => void;
}) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={cn("tabular-nums", className)}
      value={formatCeAmountDisplay(value)}
      onChange={(e) => onChange(parseCeAmountInput(e.target.value))}
    />
  );
}
