import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { upsertSaleOfferHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event upsert-sale-offer handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/upsertSaleOffer`, {
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

  it("saleOfferIdを指定しない場合、単一公演の販売商品を新規作成する", async () => {
    const fixture = await seedFixture();

    const result = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        name: "S席",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 12_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });

    expect(result).toEqual({ id: expect.any(String), updatedAt: expect.any(String) });
    const rates = await db.saleOfferRate.findMany({ where: { saleOfferId: result.id } });
    expect(rates).toHaveLength(1);
    expect(rates[0]?.price).toBe(12_000);
    const entitlements = await db.saleOfferEntitlement.findMany({
      where: { saleOfferId: result.id },
    });
    expect(entitlements).toHaveLength(1);
    expect(entitlements[0]?.performanceId).toBe(fixture.performance1.id);
  });

  it("複数の料金種別・複数公演(通し券)を指定して新規作成できる", async () => {
    const fixture = await seedFixture();

    const result = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        name: "全公演通し券 S席",
        description: "",
        maxQuantityPerOrder: 2,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 20_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 2,
            quantityStep: 1,
            displayOrder: 0,
          },
          {
            rateTypeId: fixture.childRateType.id,
            price: 15_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 2,
            quantityStep: 1,
            displayOrder: 1,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          { performanceId: fixture.performance2.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });

    const rates = await db.saleOfferRate.findMany({ where: { saleOfferId: result.id } });
    const entitlements = await db.saleOfferEntitlement.findMany({
      where: { saleOfferId: result.id },
    });
    expect(rates).toHaveLength(2);
    expect(entitlements).toHaveLength(2);
  });

  it("saleOfferIdを指定すると、価格の更新・料金種別の追加・対象公演の追加ができる", async () => {
    const fixture = await seedFixture();
    const created = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        name: "S席",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 12_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });
    const originalRateId = (
      await db.saleOfferRate.findFirstOrThrow({ where: { saleOfferId: created.id } })
    ).id;

    const updated = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        saleOfferId: created.id,
        name: "S席(値上げ)",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 13_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
          {
            rateTypeId: fixture.childRateType.id,
            price: 9_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 1,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          { performanceId: fixture.performance2.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });

    expect(updated.id).toBe(created.id);
    const adultRate = await db.saleOfferRate.findFirstOrThrow({
      where: { saleOfferId: created.id, rateTypeId: fixture.adultRateType.id },
    });
    expect(adultRate.id).toBe(originalRateId);
    expect(adultRate.price).toBe(13_000);
    const rates = await db.saleOfferRate.findMany({ where: { saleOfferId: created.id } });
    const entitlements = await db.saleOfferEntitlement.findMany({
      where: { saleOfferId: created.id },
    });
    expect(rates).toHaveLength(2);
    expect(entitlements).toHaveLength(2);
  });

  it("更新時に対象から外したrate/entitlementは削除される", async () => {
    const fixture = await seedFixture();
    const created = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        name: "通し券",
        description: "",
        maxQuantityPerOrder: 2,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 20_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 2,
            quantityStep: 1,
            displayOrder: 0,
          },
          {
            rateTypeId: fixture.childRateType.id,
            price: 15_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 2,
            quantityStep: 1,
            displayOrder: 1,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          { performanceId: fixture.performance2.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });

    await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        saleOfferId: created.id,
        name: "単日券に変更",
        description: "",
        maxQuantityPerOrder: 2,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 12_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 2,
            quantityStep: 1,
            displayOrder: 0,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });

    const rates = await db.saleOfferRate.findMany({ where: { saleOfferId: created.id } });
    const entitlements = await db.saleOfferEntitlement.findMany({
      where: { saleOfferId: created.id },
    });
    expect(rates).toHaveLength(1);
    expect(rates[0]?.rateTypeId).toBe(fixture.adultRateType.id);
    expect(entitlements).toHaveLength(1);
    expect(entitlements[0]?.performanceId).toBe(fixture.performance1.id);
  });

  it("ratesが空の場合はBAD_REQUESTを返す", async () => {
    const fixture = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("entitlementsが空の場合はBAD_REQUESTを返す", async () => {
    const fixture = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rateTypeIdが重複している場合はBAD_REQUESTを返す", async () => {
    const fixture = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
            {
              rateTypeId: fixture.adultRateType.id,
              price: 13_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 1,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("公演・席種の組み合わせが重複している場合はBAD_REQUESTを返す", async () => {
    const fixture = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("存在しない料金種別を指定するとNOT_FOUNDを返す", async () => {
    const fixture = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: "00000000-0000-0000-0000-000000000000",
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("在庫が未設定の公演・席種を指定するとBAD_REQUESTを返す", async () => {
    const fixture = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "A席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 8_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryA.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("購入済みのOrderItemが参照している料金設定は削除できない", async () => {
    const fixture = await seedFixture();
    const created = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        name: "S席",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 12_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
          {
            rateTypeId: fixture.childRateType.id,
            price: 8_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 1,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });
    const adultRate = await db.saleOfferRate.findFirstOrThrow({
      where: { saleOfferId: created.id, rateTypeId: fixture.adultRateType.id },
    });
    const buyer = await db.user.create({
      data: { name: "購入者", email: `buyer-${crypto.randomUUID()}@example.com` },
    });
    const order = await db.order.create({
      data: { userId: buyer.id, status: "PAID", subtotalAmount: 12_000, totalAmount: 12_000 },
    });
    await db.orderItem.create({
      data: { orderId: order.id, saleOfferRateId: adultRate.id, quantity: 1, unitPrice: 12_000 },
    });

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          saleOfferId: created.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.childRateType.id,
              price: 8_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const stillExists = await db.saleOfferRate.findUnique({ where: { id: adultRate.id } });
    expect(stillExists).not.toBeNull();
  });

  it("応募済みのApplicationPreferenceItemが参照している料金設定は削除できない", async () => {
    const fixture = await seedFixture();
    const created = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        name: "S席",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 12_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
          {
            rateTypeId: fixture.childRateType.id,
            price: 8_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 1,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });
    const adultRate = await db.saleOfferRate.findFirstOrThrow({
      where: { saleOfferId: created.id, rateTypeId: fixture.adultRateType.id },
    });
    const applicant = await db.user.create({
      data: { name: "応募者", email: `applicant-${crypto.randomUUID()}@example.com` },
    });
    const application = await db.application.create({
      data: { userId: applicant.id, saleWindowId: fixture.saleWindow.id, status: "APPLIED" },
    });
    const preference = await db.applicationPreference.create({
      data: { applicationId: application.id, saleOfferId: created.id, preferenceRank: 1 },
    });
    await db.applicationPreferenceItem.create({
      data: { applicationPreferenceId: preference.id, saleOfferRateId: adultRate.id, quantity: 1 },
    });

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          saleOfferId: created.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.childRateType.id,
              price: 8_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("発券済みチケットがある公演・席種の組み合わせは削除できない", async () => {
    const fixture = await seedFixture();
    const created = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: fixture.saleWindow.id,
        name: "通し券",
        description: "",
        maxQuantityPerOrder: 2,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 20_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 2,
            quantityStep: 1,
            displayOrder: 0,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          { performanceId: fixture.performance2.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });
    const rate = await db.saleOfferRate.findFirstOrThrow({ where: { saleOfferId: created.id } });
    const entitlementForPerf1 = await db.saleOfferEntitlement.findFirstOrThrow({
      where: { saleOfferId: created.id, performanceId: fixture.performance1.id },
    });
    const owner = await db.user.create({
      data: { name: "所有者", email: `owner-${crypto.randomUUID()}@example.com` },
    });
    const order = await db.order.create({
      data: { userId: owner.id, status: "PAID", subtotalAmount: 20_000, totalAmount: 20_000 },
    });
    const orderItem = await db.orderItem.create({
      data: { orderId: order.id, saleOfferRateId: rate.id, quantity: 1, unitPrice: 20_000 },
    });
    const ticket = await db.ticket.create({
      data: {
        orderItemId: orderItem.id,
        ownerUserId: owner.id,
        serialNumber: `serial-${crypto.randomUUID()}`,
        qrToken: `qr-${crypto.randomUUID()}`,
      },
    });
    const unit = await db.inventoryUnit.findFirstOrThrow({
      where: { inventoryPoolId: fixture.inventoryPoolPerf1S.id },
    });
    await db.ticketEntitlement.create({
      data: {
        ticketId: ticket.id,
        performanceId: fixture.performance1.id,
        saleOfferEntitlementId: entitlementForPerf1.id,
        inventoryUnitId: unit.id,
      },
    });

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          saleOfferId: created.id,
          name: "通し券から単日券へ変更しようとする",
          description: "",
          maxQuantityPerOrder: 2,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 20_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 2,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance2.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const stillExists = await db.saleOfferEntitlement.findUnique({
      where: { id: entitlementForPerf1.id },
    });
    expect(stillExists).not.toBeNull();
  });

  it("キャンセル済みの販売受付には商品を作成できない", async () => {
    const fixture = await seedFixture();
    await db.saleWindow.update({
      where: { id: fixture.saleWindow.id },
      data: { canceledAt: new Date(), cancelReason: "テストによるキャンセル" },
    });

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("他の販売受付に属するsaleOfferIdを指定するとNOT_FOUNDを返す", async () => {
    const fixture = await seedFixture();
    const otherSaleWindow = await db.saleWindow.create({
      data: {
        eventId: fixture.event.id,
        name: "先行販売",
        applicationStartsAt: new Date("2026-07-01T00:00:00.000Z"),
        applicationEndsAt: new Date("2026-07-10T00:00:00.000Z"),
        isSmsAuthRequired: false,
        method: "FIRST_COME",
        lotteryMode: "AUTO",
      },
    });
    const otherOffer = await upsertSaleOfferHandler({
      input: {
        eventOrganizerId: fixture.organizer.id,
        eventId: fixture.event.id,
        saleWindowId: otherSaleWindow.id,
        name: "先行S席",
        description: "",
        maxQuantityPerOrder: 4,
        displayOrder: 0,
        rates: [
          {
            rateTypeId: fixture.adultRateType.id,
            price: 12_000,
            currency: "JPY",
            minQuantity: 1,
            maxQuantity: 4,
            quantityStep: 1,
            displayOrder: 0,
          },
        ],
        entitlements: [
          { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
        ],
      },
      context: { session: { user: { id: fixture.editor.id } } },
    });

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          saleOfferId: otherOffer.id,
          name: "改ざん",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("他の主催者のイベントに属する料金種別を指定するとNOT_FOUNDを返す", async () => {
    const fixture = await seedFixture();
    const other = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: other.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("他の主催者のイベントに属する公演・席種をentitlementsに指定するとBAD_REQUESTを返す", async () => {
    const fixture = await seedFixture();
    const other = await seedFixture();

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: other.performance1.id, seatCategoryId: other.seatCategoryS.id },
          ],
        },
        context: { session: { user: { id: fixture.editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const fixture = await seedFixture();
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `viewer-${crypto.randomUUID()}@example.com` },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: fixture.organizer.id, role: "VIEWER" },
    });

    await expect(
      upsertSaleOfferHandler({
        input: {
          eventOrganizerId: fixture.organizer.id,
          eventId: fixture.event.id,
          saleWindowId: fixture.saleWindow.id,
          name: "S席",
          description: "",
          maxQuantityPerOrder: 4,
          displayOrder: 0,
          rates: [
            {
              rateTypeId: fixture.adultRateType.id,
              price: 12_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
              displayOrder: 0,
            },
          ],
          entitlements: [
            { performanceId: fixture.performance1.id, seatCategoryId: fixture.seatCategoryS.id },
          ],
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
  const performance1 = await db.performance.create({
    data: {
      eventId: event.id,
      venueId: venue.id,
      name: "DAY 1",
      doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
      startsAt: new Date("2026-09-12T09:00:00.000Z"),
    },
  });
  const performance2 = await db.performance.create({
    data: {
      eventId: event.id,
      venueId: venue.id,
      name: "DAY 2",
      doorsOpenAt: new Date("2026-09-13T08:00:00.000Z"),
      startsAt: new Date("2026-09-13T09:00:00.000Z"),
    },
  });
  const seatCategoryS = await db.seatCategory.create({
    data: { eventId: event.id, name: "S席", description: "", active: true, displayOrder: 0 },
  });
  const seatCategoryA = await db.seatCategory.create({
    data: { eventId: event.id, name: "A席", description: "", active: true, displayOrder: 1 },
  });
  const adultRateType = await db.rateType.create({
    data: { eventId: event.id, name: "大人", displayOrder: 0 },
  });
  const childRateType = await db.rateType.create({
    data: { eventId: event.id, name: "U-22", displayOrder: 1 },
  });
  const inventoryPoolPerf1S = await db.inventoryPool.create({
    data: {
      performanceId: performance1.id,
      seatCategoryId: seatCategoryS.id,
      admissionMethod: "NUMBERED_ENTRY",
      seatAllocationMethod: "IMMEDIATE",
      capacity: 10,
    },
  });
  await db.inventoryUnit.createMany({
    data: Array.from({ length: 10 }, (_, index) => ({
      inventoryPoolId: inventoryPoolPerf1S.id,
      performanceId: performance1.id,
      entryNumber: index + 1,
    })),
  });
  await db.inventoryPool.create({
    data: {
      performanceId: performance2.id,
      seatCategoryId: seatCategoryS.id,
      admissionMethod: "NUMBERED_ENTRY",
      seatAllocationMethod: "IMMEDIATE",
      capacity: 10,
    },
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

  return {
    editor,
    organizer,
    event,
    performance1,
    performance2,
    seatCategoryS,
    seatCategoryA,
    adultRateType,
    childRateType,
    inventoryPoolPerf1S,
    saleWindow,
  };
}
