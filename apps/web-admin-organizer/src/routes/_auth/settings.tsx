import { createFileRoute } from "@tanstack/react-router";

import { AccountSettingsPage } from "@/features/account/page";

export const Route = createFileRoute("/_auth/settings")({
  component: AccountSettingsPage,
});
