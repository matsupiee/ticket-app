import { createFileRoute } from "@tanstack/react-router";

import { OrganizerResetPasswordPage } from "@/features/auth/reset-password/page";

export const Route = createFileRoute("/(guest)/reset-password")({
  component: OrganizerResetPasswordPage,
});
