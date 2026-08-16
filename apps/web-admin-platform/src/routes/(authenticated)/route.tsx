import { ORPCError } from "@orpc/client";
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
    } catch (error) {
      if (!(error instanceof ORPCError)) {
        throw error;
      }

      if (error.code === "UNAUTHORIZED") {
        throw redirect({
          to: "/sign-in",
        });
      }

      if (error.code === "FORBIDDEN") {
        throw redirect({
          to: "/forbidden",
        });
      }

      // 通信エラーやサーバーエラーを「権限がない」と見せないよう、そのまま投げる
      throw error;
    }
  },
});

function AuthLayout() {
  return <Outlet />;
}
