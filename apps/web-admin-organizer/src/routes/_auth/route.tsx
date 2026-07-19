import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { hasOrganizerAdminAccess } from "@/lib/admin-access";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }

    if (!hasOrganizerAdminAccess(session.data)) {
      throw redirect({
        to: "/forbidden",
      });
    }

    return { session };
  },
});

function AuthLayout() {
  return <Outlet />;
}
