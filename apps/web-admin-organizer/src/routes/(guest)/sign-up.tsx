import { createFileRoute } from "@tanstack/react-router";

import { OrganizerSignUpPage } from "@/features/auth/sign-up/page";

export const Route = createFileRoute("/(guest)/sign-up")({
  component: OrganizerSignUpPage,
});
