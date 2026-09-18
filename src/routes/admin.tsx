import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/commerce/AdminAccountsSection";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});
