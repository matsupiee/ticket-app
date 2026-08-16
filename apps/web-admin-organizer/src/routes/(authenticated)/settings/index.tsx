import { createFileRoute } from "@tanstack/react-router";

import { AccountSettingsPage } from "@/features/account/page";

export const Route = createFileRoute("/(authenticated)/settings/")({
  component: AccountSettingsPage,
});
