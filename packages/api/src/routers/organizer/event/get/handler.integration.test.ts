import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { handler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event get handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/get`, {
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

  it("公演・席種・料金種別・在庫・販売受付・販売商品を編集可能な生データとして返す", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `editor-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "説明文" },
    });
    const session = { session: { user: { id: editor.id } } };

    // 書き込みAPIの構成に依存しないよう、取得対象のデータはPrismaで直接作る（docs/coding-pattern/test.md）
    const venue = await db.venue.create({ data: { name: "有明アリーナ" } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "DAY 1",
        doorsOpenAt: new Date("2026-09-12T17:00:00+09:00"),
        startsAt: new Date("2026-09-12T18:00:00+09:00"),
      },
    });
    const inventoryCategory = await db.inventoryCategory.create({
      data: {
        eventId: event.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
      },
    });
    const rateType = await db.rateType.create({
      data: { eventId: event.id, name: "大人", displayOrder: 0 },
    });
    await db.inventoryPool.create({
      data: {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 30,
        heldCount: 0,
        inventorySlots: { createMany: { data: Array.from({ length: 30 }, () => ({})) } },
      },
    });
    const saleWindow = await db.saleWindow.create({
      data: {
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: new Date("2026-08-01T10:00:00+09:00"),
        applicationEndsAt: new Date("2026-08-31T23:59:00+09:00"),
        isSmsAuthRequired: true,
        saleMethod: "FIRST_COME",
      },
    });
    const saleOffer = await db.saleOffer.create({
      data: {
        saleWindowId: saleWindow.id,
        name: "S席",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
      },
    });
    await db.saleOfferRate.create({
      data: { saleOfferId: saleOffer.id, rateTypeId: rateType.id, price: 12_000 },
    });
    const inventoryPool = await db.inventoryPool.findFirstOrThrow({
      where: { stageId: stage.id, inventoryCategoryId: inventoryCategory.id },
    });
    await db.saleOfferEntitlement.create({
      data: { saleOfferId: saleOffer.id, inventoryPoolId: inventoryPool.id },
    });

    const result = await handler({
      input: { eventOrganizerId: organizer.id, eventId: event.id },
      context: session,
    });

    expect(result).toMatchObject({
      id: event.id,
      name: `テストイベント ${suffix}`,
      description: "説明文",
      publishesAt: null,
      closesAt: null,
    });
    expect(result.inventoryCategories).toEqual([
      {
        id: inventoryCategory.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
        entryNumberPrefix: null,
      },
    ]);
    expect(result.rateTypes).toEqual([{ id: rateType.id, name: "大人", displayOrder: 0 }]);
    expect(result.stages).toEqual([
      {
        id: stage.id,
        name: "DAY 1",
        venueId: venue.id,
        venueName: "有明アリーナ",
        doorsOpenAt: "2026-09-12T08:00:00.000Z",
        startsAt: "2026-09-12T09:00:00.000Z",
      },
    ]);
    expect(result.inventoryPools).toEqual([
      {
        id: expect.any(String),
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 30,
        availableQuantity: 30,
      },
    ]);
    expect(result.saleWindows[0]).toMatchObject({
      id: saleWindow.id,
      name: "一般販売",
      saleMethod: "FIRST_COME",
      isSmsAuthRequired: true,
      applicationStartsAt: "2026-08-01T01:00:00.000Z",
      canceledAt: null,
    });
    expect(result.saleWindows[0]?.offers[0]).toMatchObject({
      id: saleOffer.id,
      name: "S席",
      rates: [{ id: expect.any(String), rateTypeId: rateType.id, price: 12_000 }],
      entitlements: [
        {
          id: expect.any(String),
          inventoryPoolId: inventoryPool.id,
          stageId: stage.id,
          inventoryCategoryId: inventoryCategory.id,
        },
      ],
      soldQuantity: 0,
      availableQuantity: 30,
      minPrice: 12_000,
    });
    expect(result.sales).toEqual({ grossSales: 0, ticketsSold: 0 });
  });

  it("他の主催者が所有するeventIdを指定するとNOT_FOUNDを返す", async () => {
    const suffix = crypto.randomUUID();
    const owner = await db.user.create({
      data: { name: "所有者", email: `owner-${suffix}@example.com` },
    });
    const ownerCompany = await db.company.create({ data: { name: `所有者会社 ${suffix}` } });
    const ownerOrganizer = await db.organizer.create({
      data: {
        name: `所有者主催者 ${suffix}`,
        companyId: ownerCompany.id,
      },
    });
    await db.organizerMember.create({
      data: { userId: owner.id, organizerId: ownerOrganizer.id, role: "EDITOR" },
    });
    const otherEvent = await db.event.create({
      data: { organizerId: ownerOrganizer.id, name: `所有者のイベント ${suffix}`, description: "" },
    });

    const intruder = await db.user.create({
      data: { name: "侵入者", email: `intruder-${suffix}@example.com` },
    });
    const intruderCompany = await db.company.create({ data: { name: `侵入者会社 ${suffix}` } });
    const intruderOrganizer = await db.organizer.create({
      data: {
        name: `侵入者主催者 ${suffix}`,
        companyId: intruderCompany.id,
      },
    });
    await db.organizerMember.create({
      data: { userId: intruder.id, organizerId: intruderOrganizer.id, role: "EDITOR" },
    });

    await expect(
      handler({
        input: { eventOrganizerId: intruderOrganizer.id, eventId: otherEvent.id },
        context: { session: { user: { id: intruder.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
    });
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `viewer-${suffix}@example.com` },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });

    await expect(
      handler({
        input: { eventOrganizerId: organizer.id, eventId: event.id },
        context: { session: { user: { id: viewer.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
