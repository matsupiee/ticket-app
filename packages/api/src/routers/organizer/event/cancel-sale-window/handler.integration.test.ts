import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { cancelSaleWindowHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event cancel-sale-window handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/cancelSaleWindow`, {
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

  it("正常な入力で販売受付をキャンセルする", async () => {
    const { organizer, editor, event, saleWindow } = await seedFixture();

    const result = await cancelSaleWindowHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        saleWindowId: saleWindow.id,
        cancelReason: "会場都合による中止",
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result).toEqual({ id: saleWindow.id, updatedAt: expect.any(String) });
    const updated = await db.saleWindow.findUniqueOrThrow({ where: { id: saleWindow.id } });
    expect(updated.canceledAt).not.toBeNull();
    expect(updated.cancelReason).toBe("会場都合による中止");
  });

  it("既にキャンセル済みの場合はBAD_REQUESTを返す", async () => {
    const { organizer, editor, event, saleWindow } = await seedFixture();
    await db.saleWindow.update({
      where: { id: saleWindow.id },
      data: { canceledAt: new Date(), cancelReason: "初回のキャンセル" },
    });

    await expect(
      cancelSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          saleWindowId: saleWindow.id,
          cancelReason: "二重キャンセル",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("他のイベントに属するsaleWindowIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, event } = await seedFixture();
    const other = await seedFixture();

    await expect(
      cancelSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          saleWindowId: other.saleWindow.id,
          cancelReason: "越境キャンセルの試み",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const { organizer, event, saleWindow } = await seedFixture();
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `viewer-${crypto.randomUUID()}@example.com` },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });

    await expect(
      cancelSaleWindowHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          saleWindowId: saleWindow.id,
          cancelReason: "権限がないユーザーによる操作",
        },
        context: { session: { user: { id: viewer.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

async function seedFixture() {
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
  const saleWindow = await db.saleWindow.create({
    data: {
      eventId: event.id,
      name: "一般販売",
      applicationStartsAt: new Date("2026-08-01T01:00:00.000Z"),
      applicationEndsAt: new Date("2026-08-31T14:59:00.000Z"),
      isSmsAuthRequired: false,
      method: "FIRST_COME",
      lotteryMode: "AUTO",
    },
  });

  return { editor, company, organizer, event, saleWindow };
}
