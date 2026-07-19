import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }

    try {
      const organizerAccount = await client.organizer.account.me({});

      return { session, organizerAccount };
    } catch {
      throw redirect({
        to: "/forbidden",
      });
    }
  },
});

function AuthLayout() {
  return <Outlet />;
}
