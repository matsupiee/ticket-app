import { createFileRoute } from "@tanstack/react-router";

import { PlatformSignUpPage } from "@/features/auth/sign-up/page";

export const Route = createFileRoute("/(guest)/sign-up")({
  component: PlatformSignUpPage,
});
