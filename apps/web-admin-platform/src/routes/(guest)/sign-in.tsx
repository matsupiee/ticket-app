import { createFileRoute } from "@tanstack/react-router";

import { PlatformSignInPage } from "@/features/auth/sign-in/page";

export const Route = createFileRoute("/(guest)/sign-in")({
  component: PlatformSignInPage,
});
