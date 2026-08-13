// チケット購入の見積もりと注文作成。
//
// 設計の前提は ADR 0005 / ADR 0007 を参照。要点は次のとおり。
//   - 通貨はJPY固定。金額は円単位の整数
//   - 手数料の実額は保存せず、OrderItemFee にコピーした率・固定額から都度集計する
//   - 在庫枠(InventorySlot)の確保と整理番号の採番は「注文作成時」に行う。発券時ではない
//   - 確保は InventorySlotHold で表し、どの注文が押さえているかを常に辿れるようにする
//   - 発券(Ticket/TicketEntitlement)は入金が確定してから行う。カードは即時、コンビニは入金後
import { ORPCError } from "@orpc/server";
import { db, type Prisma } from "@ticket-app/db";

// コンビニ払いの支払期限。これを過ぎた確保は解放バッチの対象になる
const KONBINI_PAYMENT_DUE_DAYS = 3;

type TicketSelection = {
  eventId: string;
  saleWindowId: string;
  stageId?: string;
  offerId: string;
  rateTypeId: string;
  quantity: number;
};

type FeeRuleForQuote = {
  id: string;
  name: string;
  displayOrder: number;
  payer: "BUYER" | "EVENT_ORGANIZER";
  rateBasisPoints: number;
  flatAmount: number;
};

type FeeLine = {
  id: string;
  name: string;
  displayOrder: number;
  payer: "BUYER" | "EVENT_ORGANIZER";
  rateBasisPoints: number;
  flatAmount: number;
  amount: number;
};

export type Quote = {
  eventId: string;
  saleWindow: {
    id: string;
    saleMethod: "FIRST_COME" | "LOTTERY";
    applicationStartsAt: Date;
    applicationEndsAt: Date;
    canceledAt: Date | null;
  };
  offer: {
    id: string;
    maxQuantityPerOrder: number;
    quantityStep: number;
  };
  offerRate: {
    id: string;
    price: number;
  };
  // 通し券の場合は複数件。各利用権が1つの在庫プール(= 公演 x 席種)を指す
  entitlements: {
    id: string;
    stageId: string;
    inventoryPoolId: string;
  }[];
  unitPrice: number;
  quantity: number;
  subtotalAmount: number;
  buyerFeeLines: FeeLine[];
  organizerFeeLines: FeeLine[];
  // 購入者が支払う手数料の合計。主催者負担は購入者の支払額に影響しない
  buyerFeeAmount: number;
  organizerFeeAmount: number;
  totalAmount: number;
};

// 手数料の実額。適用時点の率・固定額から計算する。切り下げで固定（ADR 0002）
export function calcFeeAmount(input: {
  unitPrice: number;
  quantity: number;
  rateBasisPoints: number;
  flatAmount: number;
}) {
  const perUnit = Math.floor((input.unitPrice * input.rateBasisPoints) / 10_000) + input.flatAmount;

  return perUnit * input.quantity;
}

export async function quoteTicketSelection(selection: TicketSelection): Promise<Quote> {
  const saleWindow = await db.saleWindow.findFirst({
    where: { id: selection.saleWindowId, eventId: selection.eventId },
    include: {
      saleOffers: {
        where: { id: selection.offerId },
        include: {
          saleOfferRates: true,
          saleOfferEntitlements: { include: { inventoryPool: true } },
        },
      },
    },
  });

  if (!saleWindow) {
    throw new ORPCError("NOT_FOUND");
  }

  if (saleWindow.canceledAt) {
    throw new ORPCError("BAD_REQUEST", { message: "販売受付はキャンセルされています" });
  }

  const offer = saleWindow.saleOffers[0];
  if (!offer) {
    throw new ORPCError("NOT_FOUND");
  }

  const offerRate = offer.saleOfferRates.find((rate) => rate.rateTypeId === selection.rateTypeId);
  if (!offerRate) {
    throw new ORPCError("NOT_FOUND");
  }

  // 公演の特定は inventoryPool.stageId の一本に統一している（ADR 0007）
  const entitlements = selection.stageId
    ? offer.saleOfferEntitlements.filter(
        (entitlement) => entitlement.inventoryPool.stageId === selection.stageId,
      )
    : offer.saleOfferEntitlements;

  if (entitlements.length === 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "選択した公演ではこのチケットを購入できません",
    });
  }

  validateQuantity({
    quantity: selection.quantity,
    maxQuantityPerOrder: offer.maxQuantityPerOrder,
    quantityStep: offer.quantityStep,
  });

  const feeRules = await getApplicableFeeRules({
    eventId: selection.eventId,
    saleWindowId: selection.saleWindowId,
    saleOfferId: selection.offerId,
  });
  const feeLines = feeRules.map((feeRule) =>
    toFeeLine(feeRule, offerRate.price, selection.quantity),
  );
  const buyerFeeLines = feeLines.filter((feeLine) => feeLine.payer === "BUYER");
  const organizerFeeLines = feeLines.filter((feeLine) => feeLine.payer === "EVENT_ORGANIZER");
  const buyerFeeAmount = sumAmounts(buyerFeeLines);
  const organizerFeeAmount = sumAmounts(organizerFeeLines);
  const subtotalAmount = offerRate.price * selection.quantity;

  return {
    eventId: selection.eventId,
    saleWindow: {
      id: saleWindow.id,
      saleMethod: saleWindow.saleMethod,
      applicationStartsAt: saleWindow.applicationStartsAt,
      applicationEndsAt: saleWindow.applicationEndsAt,
      canceledAt: saleWindow.canceledAt,
    },
    offer: {
      id: offer.id,
      maxQuantityPerOrder: offer.maxQuantityPerOrder,
      quantityStep: offer.quantityStep,
    },
    offerRate: { id: offerRate.id, price: offerRate.price },
    entitlements: entitlements.map((entitlement) => ({
      id: entitlement.id,
      stageId: entitlement.inventoryPool.stageId,
      inventoryPoolId: entitlement.inventoryPoolId,
    })),
    unitPrice: offerRate.price,
    quantity: selection.quantity,
    subtotalAmount,
    buyerFeeLines,
    organizerFeeLines,
    buyerFeeAmount,
    organizerFeeAmount,
    // 主催者負担は購入者の支払額に含めない
    totalAmount: subtotalAmount + buyerFeeAmount,
  };
}

// 先着販売の注文を作成する。
//
// カード払いは入金が即時に確定するため発券まで行う。
// コンビニ払いは入金前なので、在庫枠の確保と整理番号の採番までを行い発券はしない。
// どちらの場合も整理番号はこの時点で確定するので、入金の早い遅いで番号が変わらない（ADR 0005）。
export async function createFirstComeOrder(input: {
  userId: string;
  quote: Quote;
  paymentMethod: "CARD" | "KONBINI";
  providerPaymentId: string;
}) {
  const now = new Date();

  if (input.quote.saleWindow.saleMethod !== "FIRST_COME") {
    throw new ORPCError("BAD_REQUEST", { message: "先着販売ではないため即時購入できません" });
  }

  if (
    input.quote.saleWindow.applicationStartsAt > now ||
    input.quote.saleWindow.applicationEndsAt < now
  ) {
    throw new ORPCError("BAD_REQUEST", { message: "販売期間外です" });
  }

  const isPaidImmediately = input.paymentMethod === "CARD";
  // コンビニ払いは支払期限までの確保。期限切れ解放バッチが expiresAt だけを見れば済むようにする
  const holdExpiresAt = isPaidImmediately
    ? null
    : new Date(now.getTime() + KONBINI_PAYMENT_DUE_DAYS * 24 * 60 * 60 * 1000);

  return await db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: input.userId,
        status: isPaidImmediately ? "PAID" : "PROCESSING",
        subtotalAmount: input.quote.subtotalAmount,
        // 購入者負担のみ。主催者負担は OrderItemFee から集計する（ADR 0007）
        totalFeeAmount: input.quote.buyerFeeAmount,
        totalAmount: input.quote.totalAmount,
        payments: {
          create: {
            paymentMethod: input.paymentMethod,
            provider: "STRIPE",
            providerPaymentId: input.providerPaymentId,
            paymentAmount: input.quote.totalAmount,
            succeededAt: isPaidImmediately ? now : null,
          },
        },
      },
    });

    const orderItem = await tx.orderItem.create({
      data: {
        orderId: order.id,
        saleOfferRateId: input.quote.offerRate.id,
        quantity: input.quote.quantity,
        unitPrice: input.quote.unitPrice,
        orderItemFees: {
          createMany: {
            // 実額は保存せず、率と固定額をコピーしておく（ADR 0007）
            data: [...input.quote.buyerFeeLines, ...input.quote.organizerFeeLines].map(
              (feeLine) => ({
                feeRuleId: feeLine.id,
                displayOrder: feeLine.displayOrder,
                name: feeLine.name,
                payer: feeLine.payer,
                rateBasisPoints: feeLine.rateBasisPoints,
                flatAmount: feeLine.flatAmount,
              }),
            ),
          },
        },
      },
    });

    const allocatedSlotsByEntitlement = await allocateInventorySlots(tx, {
      quote: input.quote,
      orderItemId: orderItem.id,
      holdExpiresAt,
    });

    if (isPaidImmediately) {
      await issueTickets(tx, {
        orderItemId: orderItem.id,
        ownerUserId: input.userId,
        quote: input.quote,
        allocatedSlotsByEntitlement,
      });
    }

    return order;
  });
}

// 入金が確定した注文を発券する。コンビニ払いの入金通知(webhook)から呼ばれる。
// 既に発券済みの場合は何もしない（webhook の再送で二重発券しないため）。
export async function issueTicketsForPaidOrder(orderId: string) {
  return await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            inventorySlotHolds: {
              include: { inventorySlot: { include: { inventoryPool: true } } },
            },
            tickets: { select: { id: true } },
          },
        },
      },
    });

    if (!order) {
      throw new ORPCError("NOT_FOUND");
    }

    for (const orderItem of order.orderItems) {
      // 発券済みなら skip。webhook が再送されても二重に発券しない
      if (orderItem.tickets.length > 0) {
        continue;
      }

      for (const hold of orderItem.inventorySlotHolds) {
        await tx.ticket.create({
          data: {
            orderItemId: orderItem.id,
            ownerUserId: order.userId,
            ticketEntitlements: {
              create: {
                stageId: hold.inventorySlot.inventoryPool.stageId,
                inventorySlotId: hold.inventorySlotId,
              },
            },
          },
        });
      }

      // 入金が済んだので自動解放の対象から外す
      await tx.inventorySlotHold.updateMany({
        where: { orderItemId: orderItem.id },
        data: { expiresAt: null },
      });
    }

    return await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    });
  });
}

// 在庫枠を確保し、整理番号を採番して InventorySlotHold を作る。
//
// 採番は InventoryPool.nextEntryNumber を atomic に増やして払い出す。
// max(entryNumber) + 1 を読んでから書く方式は同時申込で衝突するため使わない（ADR 0005）。
async function allocateInventorySlots(
  tx: Prisma.TransactionClient,
  input: { quote: Quote; orderItemId: string; holdExpiresAt: Date | null },
) {
  const allocatedSlotsByEntitlement = new Map<string, { id: string; stageId: string }[]>();

  for (const entitlement of input.quote.entitlements) {
    // どの枠を掴むかと何番になるかは無関係なので entryNumber 順には並べない（ADR 0005）
    const slots = await tx.inventorySlot.findMany({
      where: { inventoryPoolId: entitlement.inventoryPoolId, status: "AVAILABLE" },
      orderBy: { createdAt: "asc" },
      take: input.quote.quantity,
      select: { id: true },
    });

    if (slots.length < input.quote.quantity) {
      throw new ORPCError("CONFLICT", { message: "販売可能な在庫が不足しています" });
    }

    const pool = await tx.inventoryPool.update({
      where: { id: entitlement.inventoryPoolId },
      data: {
        nextEntryNumber: { increment: input.quote.quantity },
        heldCount: { increment: input.quote.quantity },
      },
    });
    const firstEntryNumber = pool.nextEntryNumber - input.quote.quantity;

    const allocated: { id: string; stageId: string }[] = [];

    for (const [index, slot] of slots.entries()) {
      // status を条件に含めることで、同時に同じ枠を取ろうとした側が0件になり弾かれる
      const updated = await tx.inventorySlot.updateMany({
        where: { id: slot.id, status: "AVAILABLE" },
        data: { status: "HELD", entryNumber: firstEntryNumber + index },
      });

      if (updated.count !== 1) {
        throw new ORPCError("CONFLICT", { message: "販売可能な在庫が不足しています" });
      }

      await tx.inventorySlotHold.create({
        data: {
          inventorySlotId: slot.id,
          orderItemId: input.orderItemId,
          expiresAt: input.holdExpiresAt,
        },
      });

      allocated.push({ id: slot.id, stageId: entitlement.stageId });
    }

    allocatedSlotsByEntitlement.set(entitlement.id, allocated);
  }

  return allocatedSlotsByEntitlement;
}

// 1枚のチケットにつき Ticket を1件作る。
// 通し券の場合は、その Ticket に公演数分の TicketEntitlement がぶら下がる。
async function issueTickets(
  tx: Prisma.TransactionClient,
  input: {
    orderItemId: string;
    ownerUserId: string;
    quote: Quote;
    allocatedSlotsByEntitlement: Map<string, { id: string; stageId: string }[]>;
  },
) {
  for (let ticketIndex = 0; ticketIndex < input.quote.quantity; ticketIndex += 1) {
    const entitlementsForTicket = input.quote.entitlements.map((entitlement) => {
      const slot = input.allocatedSlotsByEntitlement.get(entitlement.id)?.[ticketIndex];

      if (!slot) {
        throw new ORPCError("CONFLICT", { message: "在庫の確保に失敗しました" });
      }

      return { stageId: slot.stageId, inventorySlotId: slot.id };
    });

    await tx.ticket.create({
      data: {
        orderItemId: input.orderItemId,
        ownerUserId: input.ownerUserId,
        ticketEntitlements: { create: entitlementsForTicket },
      },
    });
  }
}

async function getApplicableFeeRules(input: {
  eventId: string;
  saleWindowId: string;
  saleOfferId: string;
}) {
  // FeeRule.disabledAt はスキーマに無いため無効化判定は行わない（ADR 0007）
  return await db.feeRule.findMany({
    where: {
      eventId: input.eventId,
      OR: [
        { saleOfferId: input.saleOfferId },
        { saleWindowId: input.saleWindowId, saleOfferId: null },
        { saleWindowId: null, saleOfferId: null },
      ],
    },
    orderBy: { displayOrder: "asc" },
  });
}

// 数量の下限は持たず常に1枚から。刻みは1枚を起点に数える（ADR 0007）
function validateQuantity(input: {
  quantity: number;
  maxQuantityPerOrder: number;
  quantityStep: number;
}) {
  if (input.quantity < 1 || input.quantity > input.maxQuantityPerOrder) {
    throw new ORPCError("BAD_REQUEST", {
      message: `枚数は1枚から${input.maxQuantityPerOrder}枚まで選択できます`,
    });
  }

  if ((input.quantity - 1) % input.quantityStep !== 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: `${input.quantityStep}枚単位で選択してください`,
    });
  }
}

function toFeeLine(feeRule: FeeRuleForQuote, unitPrice: number, quantity: number): FeeLine {
  return {
    id: feeRule.id,
    name: feeRule.name,
    displayOrder: feeRule.displayOrder,
    payer: feeRule.payer,
    rateBasisPoints: feeRule.rateBasisPoints,
    flatAmount: feeRule.flatAmount,
    amount: calcFeeAmount({
      unitPrice,
      quantity,
      rateBasisPoints: feeRule.rateBasisPoints,
      flatAmount: feeRule.flatAmount,
    }),
  };
}

function sumAmounts(lines: { amount: number }[]) {
  return lines.reduce((total, line) => total + line.amount, 0);
}
