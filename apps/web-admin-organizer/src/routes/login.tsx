import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AuthPanel } from "@/shared/_components/auth-panel";

type AuthMode = "signIn" | "signUp" | "reset";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [mode, setMode] = useState<AuthMode>("signIn");

  return <AuthPanel mode={mode} onModeChange={setMode} />;
}
