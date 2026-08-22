import { createFileRoute } from "@tanstack/react-router";

import { FanSignUpPage } from "@/features/auth/sign-up/page";

export const Route = createFileRoute("/(auth)/sign-up/")({
  component: FanSignUpPage,
});
