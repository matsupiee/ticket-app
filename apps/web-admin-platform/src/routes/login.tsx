import { createFileRoute } from "@tanstack/react-router";

import { SignInPanel } from "@/shared/_components/sign-in-panel";

export const Route = createFileRoute("/login")({
  component: SignInPanel,
});
