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

const requirePlatformAccess = o.middleware(async ({ context, next }) => {
  const user = context.session?.user;

  if (!user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      platformMember: await requirePlatformMember(user.id),
    },
  });
});

// プラットフォーム管理者向けAPIは必ずこのprocedureを使う
export const platformProcedure = protectedProcedure.use(requirePlatformAccess);
