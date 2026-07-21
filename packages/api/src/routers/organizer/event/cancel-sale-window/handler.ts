import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

type CancelSaleWindowInput = {
  eventOrganizerId: string;
  eventId: string;
  saleWindowId: string;
  cancelReason: string;
};

export async function cancelSaleWindowHandler({
  input,
  context,
}: {
  input: CancelSaleWindowInput;
  context: {
    session: {
      user: {
        id: string;
      };
    };
  };
}) {
  await requireOrganizerEditor({
    organizerId: input.eventOrganizerId,
    userId: context.session.user.id,
  });

  const event = await db.event.findFirst({
    where: { id: input.eventId, organizerId: input.eventOrganizerId },
  });

  if (!event) {
    throw new ORPCError("NOT_FOUND");
  }

  const saleWindow = await db.saleWindow.findFirst({
    where: { id: input.saleWindowId, eventId: input.eventId },
  });

  if (!saleWindow) {
    throw new ORPCError("NOT_FOUND", { message: "販売受付が見つかりません" });
  }

  if (saleWindow.canceledAt) {
    throw new ORPCError("BAD_REQUEST", { message: "既にキャンセルされています" });
  }

  // 在庫の解放や進行中の応募・注文の取り扱いは、より大きな返金・キャンセルワークフローの範囲であり、
  // このハンドラでは canceledAt / cancelReason の設定のみ行う。
  const updated = await db.saleWindow.update({
    where: { id: saleWindow.id },
    data: { canceledAt: new Date(), cancelReason: input.cancelReason },
  });

  return {
    id: updated.id,
    updatedAt: updated.updatedAt.toISOString(),
  };
}
