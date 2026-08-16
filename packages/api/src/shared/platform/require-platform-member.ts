import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

// プラットフォーム管理者かどうかは PlatformMember テーブルだけを正とする。
// 画面側の出し分けやメールアドレスの許可リストは認可の境界にならないため、
// platform.* のAPIはすべてこの判定を通す。
export async function requirePlatformMember(userId: string) {
  const platformMember = await db.platformMember.findUnique({
    where: {
      userId,
    },
  });

  if (!platformMember) {
    throw new ORPCError("FORBIDDEN");
  }

  return platformMember;
}
