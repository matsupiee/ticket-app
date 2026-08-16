import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { requirePlatformMember } from "./shared/platform/require-platform-member";

const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

// プラットフォーム管理者向けAPIは必ずこのprocedureを使う
// 認証は requireAuth、認可は requirePlatformMember が担当する
export const platformProcedure = protectedProcedure.use(async ({ context, next }) => {
  return next({
    context: {
      platformMember: await requirePlatformMember(context.session.user.id),
    },
  });
});
