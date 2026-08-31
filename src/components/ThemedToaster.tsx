import { useTheme } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster richColors position="top-center" theme={resolvedTheme} />;
}
