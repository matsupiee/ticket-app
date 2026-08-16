import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/my-page")({
  component: MyPageLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      throw redirect({
        to: "/sign-in",
      });
    }

    return { session: session.data };
  },
});

function MyPageLayout() {
  return <Outlet />;
}
