// 1公演 / 2チケット種別（S席・A席）/ 1販売受付（先着）の整理番号方式シナリオ。
//
// 状態:
//   - S席 20枠 / A席 50枠。どちらも整理番号方式で、未販売の枠は entryNumber が null（ADR 0005）
//   - ユーザー1がS席を2枚カード決済で購入（入金済み・発券済み・整理番号 1, 2）
//   - ユーザー2がA席を1枚コンビニ払いで購入（入金待ち・未発券・整理番号 1）
//
// コンビニ払いの枠は入金前でも InventorySlotHold で押さえられ、整理番号も確定している。
// 発券（Ticket / TicketEntitlement）は入金後にしか作られない。
import { db } from "../../../../index";
import {
  FeePayer,
  InventorySlotStatus,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  SaleMethod,
  TicketCategoryKind,
} from "../../../../generated/prisma/client";

export const SEED_1STAGE_2TICKET_CATEGORY_1SALE_WINDOW = {
  eventName: "1公演 2チケット種別 1受付",
  stageName: "1公演 2チケット種別 1受付 公演",
  venueName: "東京ドーム",
  ticketCategoryS: { name: "S席", capacity: 20, price: 10000 },
  ticketCategoryA: { name: "A席", capacity: 50, price: 5000 },
  // 5% → 500 basis points（FeeRule のコメント参照）
  feeRateBasisPoints: 500,
  fanUser1: {
    name: "購入者1",
    email: "seed-fan-1-1stage2category@example.com",
  },
  fanUser2: {
    name: "購入者2",
    email: "seed-fan-2-1stage2category@example.com",
  },
} as const;

const S = SEED_1STAGE_2TICKET_CATEGORY_1SALE_WINDOW;

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function calcFeeAmount(subtotalAmount: number) {
  // ADR 0002 に合わせて切り下げ
  return Math.floor((subtotalAmount * S.feeRateBasisPoints) / 10000);
}

export const seed = async () => {
  // seed 全体を1トランザクションに入れ、途中で失敗しても中途半端なデータを残さない
  await db.$transaction(async (tx) => {
    const now = new Date();
    const oneWeekLater = addDays(now, 7);

    const company = await tx.company.create({ data: { name: "会社" } });
    const organizer = await tx.organizer.create({
      data: { name: "主催者", companyId: company.id },
    });
    const event = await tx.event.create({
      data: { organizerId: organizer.id, name: S.eventName, description: "" },
    });
    const venue = await tx.venue.create({ data: { name: S.venueName } });

    const stage = await tx.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: S.stageName,
        doorsOpenAt: oneWeekLater,
        // 開場の1時間後に開演する
        startsAt: new Date(oneWeekLater.getTime() + 60 * 60 * 1000),
      },
    });

    const artist = await tx.artist.create({ data: { name: "アーティスト" } });
    await tx.stageArtist.create({
      data: { stageId: stage.id, artistId: artist.id },
    });

    // 在庫枠は entryNumber を採番せずに作る。採番は注文作成時（ADR 0005）
    const createPool = async (ticketCategoryId: string, capacity: number) =>
      await tx.inventoryPool.create({
        data: {
          stageId: stage.id,
          ticketCategoryId,
          capacity,
          heldCount: 0,
          inventorySlots: {
            createMany: {
              data: Array.from({ length: capacity }, () => ({})),
            },
          },
        },
      });

    const ticketCategoryS = await tx.ticketCategory.create({
      data: {
        eventId: event.id,
        kind: TicketCategoryKind.ENTRY_NUMBER,
        name: S.ticketCategoryS.name,
        description: "",
        displayOrder: 0,
      },
    });
    const inventoryPoolS = await createPool(ticketCategoryS.id, S.ticketCategoryS.capacity);

    const ticketCategoryA = await tx.ticketCategory.create({
      data: {
        eventId: event.id,
        kind: TicketCategoryKind.ENTRY_NUMBER,
        name: S.ticketCategoryA.name,
        description: "",
        displayOrder: 1,
      },
    });
    const inventoryPoolA = await createPool(ticketCategoryA.id, S.ticketCategoryA.capacity);

    const rateType = await tx.rateType.create({
      data: { eventId: event.id, name: "通常" },
    });

    const saleWindow = await tx.saleWindow.create({
      data: {
        eventId: event.id,
        name: "一般販売",
        publishesAt: now,
        applicationStartsAt: now,
        applicationEndsAt: oneWeekLater,
        isSmsAuthRequired: false,
        saleMethod: SaleMethod.FIRST_COME,
      },
    });

    const createOffer = async (input: { name: string; price: number; inventoryPoolId: string }) => {
      const saleOffer = await tx.saleOffer.create({
        data: {
          saleWindowId: saleWindow.id,
          name: input.name,
          description: "",
        },
      });
      const saleOfferRate = await tx.saleOfferRate.create({
        data: {
          saleOfferId: saleOffer.id,
          rateTypeId: rateType.id,
          price: input.price,
        },
      });
      await tx.saleOfferEntitlement.create({
        data: {
          saleOfferId: saleOffer.id,
          inventoryPoolId: input.inventoryPoolId,
        },
      });

      return { saleOffer, saleOfferRate };
    };

    const offerS = await createOffer({
      name: S.ticketCategoryS.name,
      price: S.ticketCategoryS.price,
      inventoryPoolId: inventoryPoolS.id,
    });
    const offerA = await createOffer({
      name: S.ticketCategoryA.name,
      price: S.ticketCategoryA.price,
      inventoryPoolId: inventoryPoolA.id,
    });

    const feeRule = await tx.feeRule.create({
      data: {
        eventId: event.id,
        name: "システム手数料",
        payer: FeePayer.BUYER,
        rateBasisPoints: S.feeRateBasisPoints,
        flatAmount: 0,
      },
    });

    // 在庫枠を注文に割り当て、整理番号を採番して確保する。
    // 本番の申込処理と同じ順序（枠を取る → 採番 → hold を作る）にしておく。
    const allocateSlots = async (input: {
      inventoryPoolId: string;
      applicationItemId: string;
      quantity: number;
      // コンビニ払いのように入金待ちの場合は支払期限を入れる
      holdExpiresAt: Date | null;
    }) => {
      const slots = await tx.inventorySlot.findMany({
        where: {
          inventoryPoolId: input.inventoryPoolId,
          status: InventorySlotStatus.AVAILABLE,
        },
        orderBy: { createdAt: "asc" },
        take: input.quantity,
        select: { id: true },
      });

      if (slots.length < input.quantity) {
        throw new Error(`在庫が不足しています: ${input.inventoryPoolId}`);
      }

      const pool = await tx.inventoryPool.update({
        where: { id: input.inventoryPoolId },
        data: {
          nextEntryNumber: { increment: input.quantity },
          heldCount: { increment: input.quantity },
        },
      });
      const firstEntryNumber = pool.nextEntryNumber - input.quantity;

      return await Promise.all(
        slots.map(async (slot, index) => {
          const updated = await tx.inventorySlot.update({
            where: { id: slot.id },
            data: {
              status: InventorySlotStatus.HELD,
              entryNumber: firstEntryNumber + index,
            },
          });

          await tx.inventorySlotHold.create({
            data: {
              inventorySlotId: slot.id,
              applicationItemId: input.applicationItemId,
              expiresAt: input.holdExpiresAt,
            },
          });

          return updated;
        }),
      );
    };

    // ---- ユーザー1: S席2枚をカード決済（入金済み・発券済み） ----
    const fanUser1 = await tx.user.create({
      data: {
        name: S.fanUser1.name,
        email: S.fanUser1.email,
        emailVerified: true,
      },
    });

    const subtotalS = S.ticketCategoryS.price * 2;
    const feeS = calcFeeAmount(subtotalS);
    const applicationS = await tx.application.create({
      data: {
        userId: fanUser1.id,
        saleWindowId: saleWindow.id,
        paymentMethod: PaymentMethod.CARD,
      },
    });
    const applicationItemS = await tx.applicationItem.create({
      data: {
        applicationId: applicationS.id,
        saleOfferRateId: offerS.saleOfferRate.id,
        unitPrice: S.ticketCategoryS.price,
        quantity: 2,
        preferenceRank: 1,
        applicationItemFees: {
          create: {
            displayOrder: feeRule.displayOrder,
            feeRuleId: feeRule.id,
            name: feeRule.name,
            payer: feeRule.payer,
            rateBasisPoints: feeRule.rateBasisPoints,
            flatAmount: feeRule.flatAmount,
            amount: 1000,
          },
        },
      },
    });
    await tx.order.create({
      data: {
        userId: fanUser1.id,
        applicationId: applicationS.id,
        status: OrderStatus.COMPLETED,
        subtotalAmount: subtotalS,
        totalFeeAmount: feeS,
        totalAmount: subtotalS + feeS,
        payments: {
          create: {
            paymentMethod: PaymentMethod.CARD,
            provider: PaymentProvider.STRIPE,
            providerPaymentId: "seed-stripe-card-1stage2category",
            paymentAmount: subtotalS + feeS,
            succeededAt: now,
          },
        },
      },
    });

    // カード決済は即時入金なので hold に期限を持たせない
    const allocatedSlotsS = await allocateSlots({
      inventoryPoolId: inventoryPoolS.id,
      applicationItemId: applicationItemS.id,
      quantity: applicationItemS.quantity,
      holdExpiresAt: null,
    });

    // 入金済みなので発券する
    for (const slot of allocatedSlotsS) {
      await tx.ticket.create({
        data: {
          applicationItemId: applicationItemS.id,
          ownerUserId: fanUser1.id,
          ticketEntitlements: {
            create: { stageId: stage.id, inventorySlotId: slot.id },
          },
        },
      });
    }

    // ---- ユーザー2: A席1枚をコンビニ払い（入金待ち・未発券） ----
    const fanUser2 = await tx.user.create({
      data: {
        name: S.fanUser2.name,
        email: S.fanUser2.email,
        emailVerified: true,
      },
    });

    const subtotalA = S.ticketCategoryA.price;
    const feeA = calcFeeAmount(subtotalA);
    const applicationA = await tx.application.create({
      data: {
        userId: fanUser2.id,
        saleWindowId: saleWindow.id,
        paymentMethod: PaymentMethod.KONBINI,
      },
    });
    const applicationItemA = await tx.applicationItem.create({
      data: {
        applicationId: applicationA.id,
        saleOfferRateId: offerA.saleOfferRate.id,
        quantity: 1,
        unitPrice: S.ticketCategoryA.price,
        preferenceRank: 1,
        applicationItemFees: {
          create: {
            displayOrder: feeRule.displayOrder,
            feeRuleId: feeRule.id,
            name: feeRule.name,
            payer: feeRule.payer,
            rateBasisPoints: feeRule.rateBasisPoints,
            flatAmount: feeRule.flatAmount,
            amount: 500,
          },
        },
      },
    });

    await tx.order.create({
      data: {
        userId: fanUser2.id,
        applicationId: applicationA.id,
        status: OrderStatus.COMPLETED,
        subtotalAmount: subtotalA,
        totalFeeAmount: feeA,
        totalAmount: subtotalA + feeA,
        payments: {
          create: {
            paymentMethod: PaymentMethod.KONBINI,
            provider: PaymentProvider.STRIPE,
            providerPaymentId: "seed-stripe-konbini-1stage2category",
            paymentAmount: subtotalA + feeA,
            // 入金待ちなので succeededAt / failedAt はどちらも null
          },
        },
      },
    });

    // コンビニ払いは支払期限までの確保。期限切れバッチが解放できるよう expiresAt を入れる
    await allocateSlots({
      inventoryPoolId: inventoryPoolA.id,
      applicationItemId: applicationItemA.id,
      quantity: applicationItemA.quantity,
      holdExpiresAt: addDays(now, 3),
    });
    // 入金前なので Ticket / TicketEntitlement は作らない
  });
};
