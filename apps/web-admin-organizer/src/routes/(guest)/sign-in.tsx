import { createFileRoute } from "@tanstack/react-router";

import { OrganizerSignInPage } from "@/features/auth/sign-in/page";

export const Route = createFileRoute("/(guest)/sign-in")({
  component: OrganizerSignInPage,
});
