import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  COMMERCE_MODULE_LABELS,
  COMMERCE_MODULE_ROLE_LABELS,
  COMMERCE_MODULE_ROLE_OPTIONS,
  type CommerceModule,
  type CommerceModuleRole,
} from "@/lib/commerceModuleRoles";
import { cn } from "@/lib/utils";

interface CommerceModuleRolePickerProps {
  modules: CommerceModule[];
  getRole: (module: CommerceModule) => CommerceModuleRole;
  onRoleChange: (module: CommerceModule, role: CommerceModuleRole) => void;
  disabled?: boolean;
  className?: string;
}

export function CommerceModuleRolePicker({
  modules,
  getRole,
  onRoleChange,
  disabled = false,
  className,
}: CommerceModuleRolePickerProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      {modules.map((m) => {
        const current = getRole(m);
        return (
          <div
            key={m}
            className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span
              className="shrink-0 text-sm font-medium text-foreground/90 sm:w-[11rem] sm:truncate"
              title={COMMERCE_MODULE_LABELS[m]}
            >
              {COMMERCE_MODULE_LABELS[m]}
            </span>
            <ToggleGroup
              type="single"
              value={current}
              onValueChange={(v) => {
                if (v) onRoleChange(m, v as CommerceModuleRole);
              }}
              disabled={disabled}
              className="flex flex-wrap justify-start gap-1 sm:justify-end"
              variant="outline"
            >
              {COMMERCE_MODULE_ROLE_OPTIONS.map((r) => (
                <ToggleGroupItem
                  key={r}
                  value={r}
                  aria-label={`${COMMERCE_MODULE_LABELS[m]} - ${COMMERCE_MODULE_ROLE_LABELS[r]}`}
                  className="h-9 px-3 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {COMMERCE_MODULE_ROLE_LABELS[r]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        );
      })}
    </div>
  );
}
