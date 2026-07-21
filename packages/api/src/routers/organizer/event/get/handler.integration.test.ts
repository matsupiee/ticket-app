import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { getOrganizerEventHandler } from "./handler";
import { adjustInventoryHandler } from "../adjust-inventory/handler";
import { upsertPerformanceHandler } from "../upsert-performance/handler";
import { upsertRateTypeHandler } from "../upsert-rate-type/handler";
import { upsertSaleOfferHandler } from "../upsert-sale-offer/handler";
import { upsertSaleWindowHandler } from "../upsert-sale-window/handler";
import { upsertSeatCategoryHandler } from "../upsert-seat-category/handler";

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
      data: { name: `テスト主催者 ${suffix}`, slug: `organizer-${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "説明文" },
    });
    const session = { session: { user: { id: editor.id } } };

    const performance = await upsertPerformanceHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "DAY 1",
        venueName: "有明アリーナ",
        doorsOpenAt: "2026-09-12T17:00:00+09:00",
        startsAt: "2026-09-12T18:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      context: session,
    });
    const seatCategory = await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "S席",
        description: "",
        active: true,
        displayOrder: 0,
      },
      context: session,
    });
    const rateType = await upsertRateTypeHandler({
      input: { eventOrganizerId: organizer.id, eventId: event.id, name: "大人", displayOrder: 0 },
      context: session,
    });
    await adjustInventoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 30,
        reason: "初期在庫",
      },
      context: session,
    });
    const saleWindow = await upsertSaleWindowHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: "2026-08-01T10:00:00+09:00",
        applicationEndsAt: "2026-08-31T23:59:00+09:00",
        isSmsAuthRequired: true,
        method: "FIRST_COME",
        lotteryMode: "AUTO",
      },
      context: session,
    });
    await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        saleWindowId: saleWindow.id,
        name: "S席",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: rateType.id,
            price: 12_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
        ],
        entitlements: [{ performanceId: performance.id, seatCategoryId: seatCategory.id }],
      },
      context: session,
    });

    const result = await getOrganizerEventHandler({
      input: { eventOrganizerId: organizer.id, eventId: event.id },
      context: session,
    });

    expect(result.seatCategories).toEqual([
      { id: seatCategory.id, name: "S席", description: "", active: true, displayOrder: 0 },
    ]);
    expect(result.rateTypes).toEqual([{ id: rateType.id, name: "大人", displayOrder: 0 }]);
    expect(result.inventoryPools).toEqual([
      {
        id: expect.any(String),
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacity: 30,
        heldCount: 0,
        soldCount: 0,
      },
    ]);
    expect(result.performances[0]).toMatchObject({
      id: performance.id,
      venueName: "有明アリーナ",
      venueId: expect.any(String),
    });
    expect(result.saleWindows[0]).toMatchObject({
      id: saleWindow.id,
      isSmsAuthRequired: true,
      lotteryMode: "AUTO",
    });
    expect(result.saleWindows[0]?.offers[0]).toMatchObject({
      rates: [
        {
          id: expect.any(String),
          rateTypeId: rateType.id,
          price: 12_000,
          currency: "JPY",
          minQuantity: 1,
          maxQuantity: 4,
          quantityStep: 1,
          displayOrder: 0,
        },
      ],
      entitlements: [
        { id: expect.any(String), performanceId: performance.id, seatCategoryId: seatCategory.id },
      ],
    });
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
        slug: `owner-organizer-${suffix}`,
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
        slug: `intruder-organizer-${suffix}`,
        companyId: intruderCompany.id,
      },
    });
    await db.organizerMember.create({
      data: { userId: intruder.id, organizerId: intruderOrganizer.id, role: "EDITOR" },
    });

    await expect(
      getOrganizerEventHandler({
        input: { eventOrganizerId: intruderOrganizer.id, eventId: otherEvent.id },
        context: { session: { user: { id: intruder.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, slug: `organizer-${suffix}`, companyId: company.id },
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
      getOrganizerEventHandler({
        input: { eventOrganizerId: organizer.id, eventId: event.id },
        context: { session: { user: { id: viewer.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
