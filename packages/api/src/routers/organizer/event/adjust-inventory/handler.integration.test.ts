import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { adjustInventoryHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event adjust-inventory handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/adjustInventory`, {
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

  it("正常な入力で在庫を増加させ、公演×席種のInventoryPoolを作成する", async () => {
    const { organizer, editor, event, performance, seatCategory } = await seedFixture();

    const result = await adjustInventoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 30,
        reason: "初期在庫の設定",
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result).toEqual({ id: expect.any(String), updatedAt: expect.any(String) });
    const pool = await db.inventoryPool.findUniqueOrThrow({ where: { id: result.id } });
    expect(pool.capacity).toBe(30);
    expect(pool.performanceId).toBe(performance.id);
    expect(pool.seatCategoryId).toBe(seatCategory.id);
  });

  it("他のイベントに属するperformanceIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, event, seatCategory } = await seedFixture();
    const other = await seedFixture();

    await expect(
      adjustInventoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          performanceId: other.performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: 10,
          reason: "不正な組み合わせ",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("他のイベントに属するseatCategoryIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, event, performance } = await seedFixture();
    const other = await seedFixture();

    await expect(
      adjustInventoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          performanceId: performance.id,
          seatCategoryId: other.seatCategory.id,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: 10,
          reason: "不正な組み合わせ",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("存在しないeventIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, performance, seatCategory } = await seedFixture();

    await expect(
      adjustInventoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: "00000000-0000-0000-0000-000000000000",
          performanceId: performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: 10,
          reason: "存在しないevent",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const { organizer, event, performance, seatCategory } = await seedFixture();
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `viewer-${crypto.randomUUID()}@example.com` },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });

    await expect(
      adjustInventoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          performanceId: performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: 10,
          reason: "権限がないユーザーによる操作",
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
  const venue = await db.venue.create({ data: { name: `テスト会場 ${suffix}` } });
  const performance = await db.performance.create({
    data: {
      eventId: event.id,
      venueId: venue.id,
      name: "本公演",
      doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
      startsAt: new Date("2026-09-12T09:00:00.000Z"),
    },
  });
  const seatCategory = await db.seatCategory.create({
    data: { eventId: event.id, name: "S席", description: "", active: true, displayOrder: 0 },
  });

  return { editor, company, organizer, event, performance, seatCategory };
}
