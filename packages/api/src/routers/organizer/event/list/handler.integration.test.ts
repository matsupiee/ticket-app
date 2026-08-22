import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { handler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event list handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/list`, {
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

  it("自分の主催者のイベントだけを、最初の公演と販売方式つきで返す", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `list-editor-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: {
        organizerId: organizer.id,
        name: `対象イベント ${suffix}`,
        description: "説明文",
        publishesAt: new Date("2026-07-25T01:00:00.000Z"),
      },
    });
    const venue = await db.venue.create({ data: { name: `有明アリーナ ${suffix}` } });
    await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "DAY 2",
        doorsOpenAt: new Date("2026-09-13T08:00:00.000Z"),
        startsAt: new Date("2026-09-13T09:00:00.000Z"),
      },
    });
    await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "DAY 1",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });
    await db.saleWindow.create({
      data: {
        eventId: event.id,
        name: "一般販売",
        applicationStartsAt: new Date("2026-08-01T01:00:00.000Z"),
        applicationEndsAt: new Date("2026-08-31T14:59:00.000Z"),
        isSmsAuthRequired: false,
        saleMethod: "FIRST_COME",
      },
    });

    const otherCompany = await db.company.create({ data: { name: `別会社 ${suffix}` } });
    const otherOrganizer = await db.organizer.create({
      data: { name: `別主催者 ${suffix}`, companyId: otherCompany.id },
    });
    await db.event.create({
      data: {
        organizerId: otherOrganizer.id,
        name: `別主催者のイベント ${suffix}`,
        description: "",
      },
    });

    const result = await handler({
      input: { eventOrganizerId: organizer.id },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: event.id,
      name: `対象イベント ${suffix}`,
      description: "説明文",
      publishesAt: "2026-07-25T01:00:00.000Z",
      closesAt: null,
      stageCount: 2,
      saleMethods: ["FIRST_COME"],
      grossSales: 0,
      ticketsSold: 0,
    });
    // 一覧に出すのはいちばん早い公演
    expect(result.items[0]?.firstStage).toEqual({
      startsAt: "2026-09-12T09:00:00.000Z",
      venueName: `有明アリーナ ${suffix}`,
    });
  });

  it("イベント名・説明の部分一致で絞り込む", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `list-query-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const target = await db.event.create({
      data: { organizerId: organizer.id, name: `TOKYO ORBIT ${suffix}`, description: "" },
    });
    await db.event.create({
      data: { organizerId: organizer.id, name: `KYOTO CLASSIC ${suffix}`, description: "" },
    });
    const byDescription = await db.event.create({
      data: { organizerId: organizer.id, name: `BAY SIDE ${suffix}`, description: "TOKYO湾岸" },
    });

    const result = await handler({
      input: { eventOrganizerId: organizer.id, query: "tokyo" },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result.items.map((item) => item.id).sort()).toEqual(
      [target.id, byDescription.id].sort(),
    );
  });

  it("公開中のイベント数と売上・販売枚数を集計する", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `list-summary-${suffix}@example.com` },
    });
    const fan = await db.user.create({
      data: { name: "購入者", email: `list-fan-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    // 公開中
    const publishedEvent = await db.event.create({
      data: {
        organizerId: organizer.id,
        name: `公開中 ${suffix}`,
        description: "",
        publishesAt: new Date("2020-01-01T00:00:00.000Z"),
      },
    });
    // 公開終了済み
    await db.event.create({
      data: {
        organizerId: organizer.id,
        name: `終了 ${suffix}`,
        description: "",
        publishesAt: new Date("2020-01-01T00:00:00.000Z"),
        closesAt: new Date("2020-02-01T00:00:00.000Z"),
      },
    });
    // 下書き
    await db.event.create({
      data: { organizerId: organizer.id, name: `下書き ${suffix}`, description: "" },
    });

    const inventoryCategory = await db.inventoryCategory.create({
      data: {
        eventId: publishedEvent.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
      },
    });
    const rateType = await db.rateType.create({
      data: { eventId: publishedEvent.id, name: "大人", displayOrder: 0 },
    });
    const saleWindow = await db.saleWindow.create({
      data: {
        eventId: publishedEvent.id,
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
    const saleOfferRate = await db.saleOfferRate.create({
      data: { saleOfferId: saleOffer.id, rateTypeId: rateType.id, price: 10_000 },
    });
    const application = await db.application.create({
      data: { userId: fan.id, saleWindowId: saleWindow.id, paymentMethod: "CARD" },
    });
    const applicationItem = await db.applicationItem.create({
      data: {
        applicationId: application.id,
        saleOfferRateId: saleOfferRate.id,
        unitPrice: 10_000,
        quantity: 2,
        preferenceRank: 1,
      },
    });
    await db.order.create({
      data: {
        userId: fan.id,
        applicationId: application.id,
        status: "COMPLETED",
        subtotalAmount: 20_000,
        totalFeeAmount: 1_000,
        totalAmount: 21_000,
      },
    });
    await db.ticket.create({
      data: { applicationItemId: applicationItem.id, ownerUserId: fan.id },
    });
    await db.ticket.create({
      data: { applicationItemId: applicationItem.id, ownerUserId: fan.id },
    });
    // キャンセルされた注文は売上に含めない
    const canceledApplication = await db.application.create({
      data: { userId: fan.id, saleWindowId: saleWindow.id, paymentMethod: "CARD" },
    });
    await db.order.create({
      data: {
        userId: fan.id,
        applicationId: canceledApplication.id,
        status: "CANCELED",
        subtotalAmount: 50_000,
        totalFeeAmount: 0,
        totalAmount: 50_000,
      },
    });
    // inventoryCategory は在庫種別を作った副作用の確認用に参照しておく
    expect(inventoryCategory.eventId).toBe(publishedEvent.id);

    const result = await handler({
      input: { eventOrganizerId: organizer.id },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result.summary).toEqual({
      eventCount: 3,
      publishedEventCount: 1,
      grossSales: 20_000,
      ticketsSold: 2,
    });
    const published = result.items.find((item) => item.id === publishedEvent.id);
    expect(published?.grossSales).toBe(20_000);
    expect(published?.ticketsSold).toBe(2);
  });

  it("所属していない主催者の一覧は取得できない", async () => {
    const suffix = crypto.randomUUID();
    const intruder = await db.user.create({
      data: { name: "侵入者", email: `list-intruder-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });

    await expect(
      handler({
        input: { eventOrganizerId: organizer.id },
        context: { session: { user: { id: intruder.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
