import { ORPCError } from "@orpc/server";
import { db, type Prisma } from "@ticket-app/db";

import { requireOrganizerEditor } from "../../../../shared/organizer-access";

type UpsertPerformanceInput = {
  eventOrganizerId: string;
  eventId: string;
  performanceId?: string;
  name: string;
  venueId?: string;
  venueName: string;
  doorsOpenAt: string;
  startsAt: string;
  admissionMethod: "GENERAL_ADMISSION" | "NUMBERED_ENTRY" | "RESERVED_SEAT";
  seatLayoutId?: string;
};

export async function upsertPerformanceHandler({
  input,
  context,
}: {
  input: UpsertPerformanceInput;
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

  const doorsOpenAt = parseDate(input.doorsOpenAt);
  const startsAt = parseDate(input.startsAt);

  if (doorsOpenAt > startsAt) {
    throw new ORPCError("BAD_REQUEST", { message: "開場日時は開演日時より後にできません" });
  }

  const performance = await db.$transaction(async (tx) => {
    const existingPerformance = input.performanceId
      ? await tx.performance.findFirst({
          where: { id: input.performanceId, eventId: input.eventId },
        })
      : null;

    if (input.performanceId && !existingPerformance) {
      throw new ORPCError("NOT_FOUND", { message: "公演が見つかりません" });
    }

    const venueId = await resolveVenueId(tx, {
      eventId: input.eventId,
      venueId: input.venueId,
      venueName: input.venueName,
    });

    if (input.seatLayoutId) {
      const seatLayout = await tx.seatLayout.findFirst({
        where: { id: input.seatLayoutId, venueId },
      });

      if (!seatLayout) {
        throw new ORPCError("BAD_REQUEST", {
          message: "座席レイアウトが指定した会場に属していません",
        });
      }
    }

    // NOTE: input.admissionMethod は Performance に対応するカラムが存在しないため保存しない。
    // 実際の入場方式は公演×席種ごとの InventoryPool.admissionMethod が真の情報源であり、adjustInventory 側で設定する。
    const data = {
      name: input.name,
      venueId,
      doorsOpenAt,
      startsAt,
      seatLayoutId: input.seatLayoutId ?? null,
    };

    if (existingPerformance) {
      return tx.performance.update({ where: { id: existingPerformance.id }, data });
    }

    return tx.performance.create({ data: { ...data, eventId: input.eventId } });
  });

  return {
    id: performance.id,
    updatedAt: performance.updatedAt.toISOString(),
  };
}

// Venue・SeatLayout は主催者非依存のグローバルなテーブルであるため、クライアントが指定した venueId を
// 無条件に信用して name を書き換えると他主催者のデータを汚染しうる。
// venueId が指定された場合は「このイベント内の他の公演が既に使っている会場か」だけを確認して紐付け、
// name の更新は行わない。venueId が無ければ、このイベント内に同名の Venue が無いか探して再利用し、
// 無ければ新規作成する。
async function resolveVenueId(
  tx: Prisma.TransactionClient,
  input: { eventId: string; venueId?: string; venueName: string },
) {
  if (input.venueId) {
    const usedWithinEvent = await tx.performance.findFirst({
      where: { eventId: input.eventId, venueId: input.venueId },
    });

    if (!usedWithinEvent) {
      throw new ORPCError("BAD_REQUEST", {
        message: "指定した会場はこのイベント内で見つかりません",
      });
    }

    return input.venueId;
  }

  const reusableVenue = await tx.venue.findFirst({
    where: { name: input.venueName, performances: { some: { eventId: input.eventId } } },
  });

  if (reusableVenue) {
    return reusableVenue.id;
  }

  const createdVenue = await tx.venue.create({ data: { name: input.venueName } });

  return createdVenue.id;
}

function parseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "日時の形式が正しくありません" });
  }

  return date;
}
