import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

type UpsertSaleWindowInput = {
  eventOrganizerId: string;
  eventId: string;
  saleWindowId?: string;
  name: string;
  publishesAt?: string;
  applicationStartsAt: string;
  applicationEndsAt: string;
  isSmsAuthRequired: boolean;
  method: "FIRST_COME" | "LOTTERY";
  lotteryMode: "MANUAL" | "AUTO";
  notifyLotteryResultAt?: string;
};

export async function upsertSaleWindowHandler({
  input,
  context,
}: {
  input: UpsertSaleWindowInput;
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

  const applicationStartsAt = parseDate(input.applicationStartsAt);
  const applicationEndsAt = parseDate(input.applicationEndsAt);
  const publishesAt = input.publishesAt ? parseDate(input.publishesAt) : null;
  const notifyLotteryResultAt = input.notifyLotteryResultAt
    ? parseDate(input.notifyLotteryResultAt)
    : null;

  if (applicationStartsAt >= applicationEndsAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "申込開始日時は申込終了日時より前にしてください",
    });
  }

  if (publishesAt && publishesAt > applicationStartsAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "公開日時は申込開始日時以前にしてください",
    });
  }

  if (input.method === "LOTTERY" && !notifyLotteryResultAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "抽選方式の場合は当落発表日時を指定してください",
    });
  }

  const data = {
    name: input.name,
    publishesAt,
    applicationStartsAt,
    applicationEndsAt,
    isSmsAuthRequired: input.isSmsAuthRequired,
    method: input.method,
    lotteryMode: input.lotteryMode,
    notifyLotteryResultAt,
  };

  const saleWindow = await db.$transaction(async (tx) => {
    if (input.saleWindowId) {
      const existing = await tx.saleWindow.findFirst({
        where: { id: input.saleWindowId, eventId: input.eventId },
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "販売受付が見つかりません" });
      }

      if (existing.canceledAt) {
        throw new ORPCError("BAD_REQUEST", { message: "キャンセル済みの販売受付は編集できません" });
      }

      return tx.saleWindow.update({ where: { id: existing.id }, data });
    }

    return tx.saleWindow.create({ data: { ...data, eventId: input.eventId } });
  });

  return {
    id: saleWindow.id,
    updatedAt: saleWindow.updatedAt.toISOString(),
  };
}

function parseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "日時の形式が正しくありません" });
  }

  return date;
}
