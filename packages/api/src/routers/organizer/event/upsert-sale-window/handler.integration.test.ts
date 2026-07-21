import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { upsertSaleWindowHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event upsert-sale-window handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/upsertSaleWindow`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        json: {},
      }),
    });

    expect(response.status).toBe(401);
  });

  it("saleWindowIdを指定しない場合、先着方式の販売受付を新規作成する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    const result = await upsertSaleWindowHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: "2026-08-01T10:00:00+09:00",
        applicationEndsAt: "2026-08-31T23:59:00+09:00",
        isSmsAuthRequired: false,
        method: "FIRST_COME",
        lotteryMode: "AUTO",
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result).toEqual({ id: expect.any(String), updatedAt: expect.any(String) });
    const saleWindow = await db.saleWindow.findUniqueOrThrow({ where: { id: result.id } });
    expect(saleWindow.name).toBe("一般販売");
    expect(saleWindow.method).toBe("FIRST_COME");
    expect(saleWindow.publishesAt).toBeNull();
    expect(saleWindow.isSmsAuthRequired).toBe(false);
  });

  it("抽選方式かつ当落発表日時ありで新規作成できる", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    const result = await upsertSaleWindowHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "オフィシャル先行",
        publishesAt: "2026-07-18T12:00:00+09:00",
        applicationStartsAt: "2026-07-25T10:00:00+09:00",
        applicationEndsAt: "2026-08-05T23:59:00+09:00",
        isSmsAuthRequired: true,
        method: "LOTTERY",
        lotteryMode: "AUTO",
        notifyLotteryResultAt: "2026-08-09T18:00:00+09:00",
      },
      context: { session: { user: { id: editor.id } } },
    });

    const saleWindow = await db.saleWindow.findUniqueOrThrow({ where: { id: result.id } });
    expect(saleWindow.method).toBe("LOTTERY");
    expect(saleWindow.isSmsAuthRequired).toBe(true);
    expect(saleWindow.notifyLotteryResultAt?.toISOString()).toBe("2026-08-09T09:00:00.000Z");
  });

  it("saleWindowIdを指定すると、既存の販売受付を更新する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const created = await upsertSaleWindowHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: "2026-08-01T10:00:00+09:00",
        applicationEndsAt: "2026-08-31T23:59:00+09:00",
        isSmsAuthRequired: false,
        method: "FIRST_COME",
        lotteryMode: "AUTO",
      },
      context: { session: { user: { id: editor.id } } },
    });

    const updated = await upsertSaleWindowHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        saleWindowId: created.id,
        name: "一般販売(延長)",
        applicationStartsAt: "2026-08-01T10:00:00+09:00",
        applicationEndsAt: "2026-09-05T23:59:00+09:00",
        isSmsAuthRequired: false,
        method: "FIRST_COME",
        lotteryMode: "AUTO",
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(updated.id).toBe(created.id);
    const saleWindow = await db.saleWindow.findUniqueOrThrow({ where: { id: created.id } });
    expect(saleWindow.name).toBe("一般販売(延長)");
    expect(saleWindow.applicationEndsAt.toISOString()).toBe("2026-09-05T14:59:00.000Z");

    const count = await db.saleWindow.count({ where: { eventId: event.id } });
    expect(count).toBe(1);
  });

  it("申込開始日時が申込終了日時以降の場合はBAD_REQUESTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    await expect(
      upsertSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "一般販売",
          applicationStartsAt: "2026-08-31T23:59:00+09:00",
          applicationEndsAt: "2026-08-01T10:00:00+09:00",
          isSmsAuthRequired: false,
          method: "FIRST_COME",
          lotteryMode: "AUTO",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("公開日時が申込開始日時より後の場合はBAD_REQUESTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    await expect(
      upsertSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "一般販売",
          publishesAt: "2026-08-15T00:00:00+09:00",
          applicationStartsAt: "2026-08-01T10:00:00+09:00",
          applicationEndsAt: "2026-08-31T23:59:00+09:00",
          isSmsAuthRequired: false,
          method: "FIRST_COME",
          lotteryMode: "AUTO",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("抽選方式で当落発表日時を指定しない場合はBAD_REQUESTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    await expect(
      upsertSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "オフィシャル先行",
          applicationStartsAt: "2026-08-01T10:00:00+09:00",
          applicationEndsAt: "2026-08-31T23:59:00+09:00",
          isSmsAuthRequired: false,
          method: "LOTTERY",
          lotteryMode: "AUTO",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("キャンセル済みの販売受付は編集できない", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const created = await upsertSaleWindowHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: "2026-08-01T10:00:00+09:00",
        applicationEndsAt: "2026-08-31T23:59:00+09:00",
        isSmsAuthRequired: false,
        method: "FIRST_COME",
        lotteryMode: "AUTO",
      },
      context: { session: { user: { id: editor.id } } },
    });
    await db.saleWindow.update({
      where: { id: created.id },
      data: { canceledAt: new Date(), cancelReason: "テストによるキャンセル" },
    });

    await expect(
      upsertSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          saleWindowId: created.id,
          name: "復活させようとする",
          applicationStartsAt: "2026-08-01T10:00:00+09:00",
          applicationEndsAt: "2026-08-31T23:59:00+09:00",
          isSmsAuthRequired: false,
          method: "FIRST_COME",
          lotteryMode: "AUTO",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("他のイベントに属するsaleWindowIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const other = await seedEditorWithEvent();
    const otherSaleWindow = await upsertSaleWindowHandler({
      input: {
        eventOrganizerId: other.organizer.id,
        eventId: other.event.id,
        name: "一般販売",
        applicationStartsAt: "2026-08-01T10:00:00+09:00",
        applicationEndsAt: "2026-08-31T23:59:00+09:00",
        isSmsAuthRequired: false,
        method: "FIRST_COME",
        lotteryMode: "AUTO",
      },
      context: { session: { user: { id: other.editor.id } } },
    });

    await expect(
      upsertSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          saleWindowId: otherSaleWindow.id,
          name: "改ざん",
          applicationStartsAt: "2026-08-01T10:00:00+09:00",
          applicationEndsAt: "2026-08-31T23:59:00+09:00",
          isSmsAuthRequired: false,
          method: "FIRST_COME",
          lotteryMode: "AUTO",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const { organizer, event } = await seedEditorWithEvent();
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `viewer-${crypto.randomUUID()}@example.com` },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });

    await expect(
      upsertSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "一般販売",
          applicationStartsAt: "2026-08-01T10:00:00+09:00",
          applicationEndsAt: "2026-08-31T23:59:00+09:00",
          isSmsAuthRequired: false,
          method: "FIRST_COME",
          lotteryMode: "AUTO",
        },
        context: { session: { user: { id: viewer.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

async function seedEditorWithEvent() {
  const suffix = crypto.randomUUID();
  const editor = await db.user.create({
    data: { name: "主催者ユーザー", email: `editor-${suffix}@example.com` },
  });
  const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
  const organizer = await db.organizer.create({
    data: { name: `テスト主催者 ${suffix}`, slug: `organizer-${suffix}`, companyId: company.id },
  });
  await db.organizerMember.create({
    data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
  });
  const event = await db.event.create({
    data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
  });

  return { editor, company, organizer, event };
}
