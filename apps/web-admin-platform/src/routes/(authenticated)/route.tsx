import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/(authenticated)")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      throw redirect({
        to: "/sign-in",
      });
    }

    // 認可の判定はサーバー側（PlatformMember）だけを正とする。
    // ここでの分岐は画面表示のためのもので、APIは platformProcedure で別途強制している。
    try {
      const platformAccount = await client.platform.account.me({});

      return { session, platformAccount };
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
