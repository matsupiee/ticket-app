import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { handler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event edit-sales-setting handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/editSalesSetting`, {
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

  it("在庫種別・料金種別・在庫・販売受付・販売商品を一度に作成し、keyの参照を実IDへ解決する", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `sales-create-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `イベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "DAY 1",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });

    await handler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        inventoryCategories: [
          {
            key: "local-s",
            kind: "ENTRY_NUMBER",
            name: "S席",
            description: "",
            displayOrder: 0,
            entryNumberPrefix: "S",
          },
        ],
        rateTypes: [{ key: "local-adult", name: "大人", displayOrder: 0 }],
        inventories: [{ stageId: stage.id, inventoryCategoryKey: "local-s", capacity: 30 }],
        saleWindows: [
          {
            key: "local-window",
            name: "一般販売",
            publishesAt: "2026-07-25T10:00:00+09:00",
            applicationStartsAt: "2026-08-01T10:00:00+09:00",
            applicationEndsAt: "2026-08-31T23:59:00+09:00",
            isSmsAuthRequired: true,
            saleMethod: "FIRST_COME",
            offers: [
              {
                key: "local-offer",
                name: "S席",
                description: "",
                maxQuantityPerOrder: 4,
                quantityStep: 1,
                displayOrder: 0,
                rates: [{ rateTypeKey: "local-adult", price: 12_000 }],
                entitlements: [{ stageId: stage.id, inventoryCategoryKey: "local-s" }],
              },
            ],
          },
        ],
      },
      context: { session: { user: { id: editor.id } } },
    });

    const inventoryCategory = await db.inventoryCategory.findFirstOrThrow({
      where: { eventId: event.id },
    });
    expect(inventoryCategory.name).toBe("S席");
    expect(inventoryCategory.kind).toBe("ENTRY_NUMBER");
    expect(inventoryCategory.entryNumberPrefix).toBe("S");

    const rateType = await db.rateType.findFirstOrThrow({ where: { eventId: event.id } });
    expect(rateType.name).toBe("大人");

    const pool = await db.inventoryPool.findFirstOrThrow({
      where: { stageId: stage.id, inventoryCategoryId: inventoryCategory.id },
      include: { inventorySlots: true },
    });
    expect(pool.capacity).toBe(30);
    expect(pool.inventorySlots).toHaveLength(30);

    const saleWindow = await db.saleWindow.findFirstOrThrow({
      where: { eventId: event.id },
      include: {
        saleOffers: {
          include: { saleOfferRates: true, saleOfferEntitlements: true },
        },
      },
    });
    expect(saleWindow.name).toBe("一般販売");
    expect(saleWindow.saleMethod).toBe("FIRST_COME");
    expect(saleWindow.isSmsAuthRequired).toBe(true);
    expect(saleWindow.applicationStartsAt.toISOString()).toBe("2026-08-01T01:00:00.000Z");
    expect(saleWindow.saleOffers).toHaveLength(1);
    expect(saleWindow.saleOffers[0]?.saleOfferRates).toEqual([
      expect.objectContaining({ rateTypeId: rateType.id, price: 12_000 }),
    ]);
    expect(saleWindow.saleOffers[0]?.saleOfferEntitlements).toEqual([
      expect.objectContaining({ inventoryPoolId: pool.id }),
    ]);
  });

  it("既存の料金は価格を更新し、入力から消えた料金は削除する", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `sales-rate-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `イベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "DAY 1",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
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
    const adult = await db.rateType.create({
      data: { eventId: event.id, name: "大人", displayOrder: 0 },
    });
    const child = await db.rateType.create({
      data: { eventId: event.id, name: "子供", displayOrder: 1 },
    });
    const pool = await db.inventoryPool.create({
      data: {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 10,
        inventorySlots: { createMany: { data: Array.from({ length: 10 }, () => ({})) } },
      },
    });
    const saleWindow = await db.saleWindow.create({
      data: {
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: new Date("2026-08-01T01:00:00.000Z"),
        applicationEndsAt: new Date("2026-08-31T14:59:00.000Z"),
        isSmsAuthRequired: false,
        saleMethod: "FIRST_COME",
      },
    });
    const saleOffer = await db.saleOffer.create({
      data: { saleWindowId: saleWindow.id, name: "S席", description: "" },
    });
    await db.saleOfferRate.create({
      data: { saleOfferId: saleOffer.id, rateTypeId: adult.id, price: 8_000 },
    });
    const childRate = await db.saleOfferRate.create({
      data: { saleOfferId: saleOffer.id, rateTypeId: child.id, price: 4_000 },
    });
    await db.saleOfferEntitlement.create({
      data: { saleOfferId: saleOffer.id, inventoryPoolId: pool.id },
    });

    await handler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        inventoryCategories: [
          {
            key: inventoryCategory.id,
            id: inventoryCategory.id,
            kind: "ENTRY_NUMBER",
            name: "S席",
            description: "",
            displayOrder: 0,
          },
        ],
        rateTypes: [{ key: adult.id, id: adult.id, name: "大人", displayOrder: 0 }],
        inventories: [
          { stageId: stage.id, inventoryCategoryKey: inventoryCategory.id, capacity: 10 },
        ],
        saleWindows: [
          {
            key: saleWindow.id,
            id: saleWindow.id,
            name: "一般販売",
            publishesAt: "2026-07-25T10:00:00+09:00",
            applicationStartsAt: "2026-08-01T10:00:00+09:00",
            applicationEndsAt: "2026-08-31T23:59:00+09:00",
            isSmsAuthRequired: false,
            saleMethod: "FIRST_COME",
            offers: [
              {
                key: saleOffer.id,
                id: saleOffer.id,
                name: "S席",
                description: "",
                maxQuantityPerOrder: 4,
                quantityStep: 1,
                displayOrder: 0,
                rates: [{ rateTypeKey: adult.id, price: 9_500 }],
                entitlements: [{ stageId: stage.id, inventoryCategoryKey: inventoryCategory.id }],
              },
            ],
          },
        ],
      },
      context: { session: { user: { id: editor.id } } },
    });

    const rates = await db.saleOfferRate.findMany({ where: { saleOfferId: saleOffer.id } });
    expect(rates).toHaveLength(1);
    expect(rates[0]?.rateTypeId).toBe(adult.id);
    expect(rates[0]?.price).toBe(9_500);
    const removed = await db.saleOfferRate.findUnique({ where: { id: childRate.id } });
    expect(removed).toBeNull();
  });

  it("申し込みがある料金を入力から外すとBAD_REQUESTになり、価格も更新されない", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `sales-applied-${suffix}@example.com` },
    });
    const fan = await db.user.create({
      data: { name: "購入者", email: `sales-fan-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `イベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "DAY 1",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
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
    const pool = await db.inventoryPool.create({
      data: {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 5,
        inventorySlots: { createMany: { data: Array.from({ length: 5 }, () => ({})) } },
      },
    });
    const saleWindow = await db.saleWindow.create({
      data: {
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: new Date("2026-08-01T01:00:00.000Z"),
        applicationEndsAt: new Date("2026-08-31T14:59:00.000Z"),
        isSmsAuthRequired: false,
        saleMethod: "FIRST_COME",
      },
    });
    const saleOffer = await db.saleOffer.create({
      data: { saleWindowId: saleWindow.id, name: "S席", description: "" },
    });
    const appliedRate = await db.saleOfferRate.create({
      data: { saleOfferId: saleOffer.id, rateTypeId: rateType.id, price: 8_000 },
    });
    await db.saleOfferEntitlement.create({
      data: { saleOfferId: saleOffer.id, inventoryPoolId: pool.id },
    });
    const application = await db.application.create({
      data: { userId: fan.id, saleWindowId: saleWindow.id, paymentMethod: "CARD" },
    });
    await db.applicationItem.create({
      data: {
        applicationId: application.id,
        saleOfferRateId: appliedRate.id,
        unitPrice: 8_000,
        quantity: 1,
        preferenceRank: 1,
      },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          inventoryCategories: [
            {
              key: inventoryCategory.id,
              id: inventoryCategory.id,
              kind: "ENTRY_NUMBER",
              name: "S席",
              description: "",
              displayOrder: 0,
            },
          ],
          rateTypes: [{ key: rateType.id, id: rateType.id, name: "大人", displayOrder: 0 }],
          inventories: [
            { stageId: stage.id, inventoryCategoryKey: inventoryCategory.id, capacity: 5 },
          ],
          saleWindows: [
            {
              key: saleWindow.id,
              id: saleWindow.id,
              name: "一般販売（改名）",
              publishesAt: "2026-07-25T10:00:00+09:00",
              applicationStartsAt: "2026-08-01T10:00:00+09:00",
              applicationEndsAt: "2026-08-31T23:59:00+09:00",
              isSmsAuthRequired: false,
              saleMethod: "FIRST_COME",
              offers: [
                {
                  key: saleOffer.id,
                  id: saleOffer.id,
                  name: "S席",
                  description: "",
                  maxQuantityPerOrder: 4,
                  quantityStep: 1,
                  displayOrder: 0,
                  // 申し込み済みの料金種別を外した状態で送る
                  rates: [],
                  entitlements: [{ stageId: stage.id, inventoryCategoryKey: inventoryCategory.id }],
                },
              ],
            },
          ],
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const rate = await db.saleOfferRate.findUniqueOrThrow({ where: { id: appliedRate.id } });
    expect(rate.price).toBe(8_000);
    // トランザクションが巻き戻るので受付名の変更も反映されない
    const unchangedWindow = await db.saleWindow.findUniqueOrThrow({ where: { id: saleWindow.id } });
    expect(unchangedWindow.name).toBe("一般販売");
  });

  it("在庫が作られていない組み合わせの券はBAD_REQUESTになる", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `sales-no-pool-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `イベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "DAY 1",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          inventoryCategories: [
            {
              key: "local-s",
              kind: "ENTRY_NUMBER",
              name: "S席",
              description: "",
              displayOrder: 0,
            },
          ],
          rateTypes: [{ key: "local-adult", name: "大人", displayOrder: 0 }],
          // 在庫を設定しないまま券だけ作ろうとする
          inventories: [],
          saleWindows: [
            {
              key: "local-window",
              name: "一般販売",
              publishesAt: "2026-07-25T10:00:00+09:00",
              applicationStartsAt: "2026-08-01T10:00:00+09:00",
              applicationEndsAt: "2026-08-31T23:59:00+09:00",
              isSmsAuthRequired: false,
              saleMethod: "FIRST_COME",
              offers: [
                {
                  key: "local-offer",
                  name: "S席",
                  description: "",
                  maxQuantityPerOrder: 4,
                  quantityStep: 1,
                  displayOrder: 0,
                  rates: [{ rateTypeKey: "local-adult", price: 8_000 }],
                  entitlements: [{ stageId: stage.id, inventoryCategoryKey: "local-s" }],
                },
              ],
            },
          ],
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const inventoryCategories = await db.inventoryCategory.findMany({
      where: { eventId: event.id },
    });
    expect(inventoryCategories).toHaveLength(0);
  });

  it("cancelReasonを渡すと販売受付をキャンセル済みにする", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `sales-cancel-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `イベント ${suffix}`, description: "" },
    });
    const saleWindow = await db.saleWindow.create({
      data: {
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: new Date("2026-08-01T01:00:00.000Z"),
        applicationEndsAt: new Date("2026-08-31T14:59:00.000Z"),
        isSmsAuthRequired: false,
        saleMethod: "FIRST_COME",
      },
    });

    await handler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        inventoryCategories: [],
        rateTypes: [],
        inventories: [],
        saleWindows: [
          {
            key: saleWindow.id,
            id: saleWindow.id,
            name: "一般販売",
            publishesAt: "2026-07-25T10:00:00+09:00",
            applicationStartsAt: "2026-08-01T10:00:00+09:00",
            applicationEndsAt: "2026-08-31T23:59:00+09:00",
            isSmsAuthRequired: false,
            saleMethod: "FIRST_COME",
            cancelReason: "会場都合により中止",
            offers: [],
          },
        ],
      },
      context: { session: { user: { id: editor.id } } },
    });

    const canceled = await db.saleWindow.findUniqueOrThrow({ where: { id: saleWindow.id } });
    expect(canceled.canceledAt).not.toBeNull();
    expect(canceled.cancelReason).toBe("会場都合により中止");
  });

  it("他の主催者が所有するイベントはNOT_FOUNDになる", async () => {
    const suffix = crypto.randomUUID();
    const owner = await db.user.create({
      data: { name: "所有者", email: `sales-owner-${suffix}@example.com` },
    });
    const ownerCompany = await db.company.create({ data: { name: `所有者会社 ${suffix}` } });
    const ownerOrganizer = await db.organizer.create({
      data: { name: `所有者主催者 ${suffix}`, companyId: ownerCompany.id },
    });
    await db.organizerMember.create({
      data: { userId: owner.id, organizerId: ownerOrganizer.id, role: "EDITOR" },
    });
    const ownerEvent = await db.event.create({
      data: { organizerId: ownerOrganizer.id, name: `所有者のイベント ${suffix}`, description: "" },
    });

    const intruder = await db.user.create({
      data: { name: "侵入者", email: `sales-intruder-${suffix}@example.com` },
    });
    const intruderCompany = await db.company.create({ data: { name: `侵入者会社 ${suffix}` } });
    const intruderOrganizer = await db.organizer.create({
      data: { name: `侵入者主催者 ${suffix}`, companyId: intruderCompany.id },
    });
    await db.organizerMember.create({
      data: { userId: intruder.id, organizerId: intruderOrganizer.id, role: "EDITOR" },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: intruderOrganizer.id,
          eventId: ownerEvent.id,
          inventoryCategories: [],
          rateTypes: [],
          inventories: [],
          saleWindows: [],
        },
        context: { session: { user: { id: intruder.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
