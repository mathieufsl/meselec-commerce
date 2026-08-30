import { toast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastInput) => {
      if (variant === "destructive") {
        toast.error(title ?? "Erreur", { description });
      } else {
        toast.success(title ?? "OK", { description });
      }
    },
  };
}
