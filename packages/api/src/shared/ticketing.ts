import { ORPCError } from "@orpc/server";
import { db, type Prisma } from "@ticket-app/db";

type TicketSelection = {
  eventId: string;
  saleWindowId: string;
  performanceId?: string;
  offerId: string;
  rateTypeId: string;
  quantity: number;
};

type FeeRuleForQuote = {
  id: string;
  name: string;
  displayOrder: number;
  payer: "BUYER" | "EVENT_ORGANIZER";
  currency: string;
  rateBasisPoints: number;
  flatAmount: number;
};

type Quote = {
  eventId: string;
  saleWindow: {
    id: string;
    method: "FIRST_COME" | "LOTTERY";
    applicationStartsAt: Date;
    applicationEndsAt: Date;
    canceledAt: Date | null;
  };
  offer: {
    id: string;
    maxQuantityPerOrder: number;
  };
  offerRate: {
    id: string;
    price: number;
    currency: string;
    minQuantity: number;
    maxQuantity: number;
    quantityStep: number;
  };
  entitlements: {
    id: string;
    performanceId: string;
    inventoryPoolId: string;
  }[];
  unitPrice: number;
  quantity: number;
  subtotalAmount: number;
  buyerFeeLines: {
    id: string;
    name: string;
    payer: "BUYER";
    amount: number;
  }[];
  organizerFeeLines: {
    id: string;
    name: string;
    payer: "EVENT_ORGANIZER";
    amount: number;
  }[];
  buyerFeeAmount: number;
  organizerFeeAmount: number;
  totalAmount: number;
  currency: string;
};

export async function quoteTicketSelection(selection: TicketSelection): Promise<Quote> {
  const saleWindow = await db.saleWindow.findFirst({
    where: {
      id: selection.saleWindowId,
      eventId: selection.eventId,
    },
    include: {
      saleOffers: {
        where: {
          id: selection.offerId,
        },
        include: {
          saleOfferRates: true,
          saleOfferEntitlements: {
            include: {
              inventoryPool: true,
            },
          },
        },
      },
    },
  });

  if (!saleWindow) {
    throw new ORPCError("NOT_FOUND");
  }

  if (saleWindow.canceledAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "販売受付はキャンセルされています",
    });
  }

  const offer = saleWindow.saleOffers[0];
  if (!offer) {
    throw new ORPCError("NOT_FOUND");
  }

  const offerRate = offer.saleOfferRates.find((rate) => rate.rateTypeId === selection.rateTypeId);
  if (!offerRate) {
    throw new ORPCError("NOT_FOUND");
  }

  const entitlements = filterEntitlementsByPerformance({
    entitlements: offer.saleOfferEntitlements,
    performanceId: selection.performanceId,
  });

  if (entitlements.length === 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "選択した公演ではこのチケットを購入できません",
    });
  }

  validateQuantity({
    quantity: selection.quantity,
    offerMaxQuantity: offer.maxQuantityPerOrder,
    rateMinQuantity: offerRate.minQuantity,
    rateMaxQuantity: offerRate.maxQuantity,
    quantityStep: offerRate.quantityStep,
  });

  const feeRules = await getApplicableFeeRules({
    eventId: selection.eventId,
    saleWindowId: selection.saleWindowId,
    saleOfferId: selection.offerId,
  });
  const feeLines = feeRules.map((feeRule) =>
    toFeeLine(feeRule, offerRate.price, selection.quantity),
  );
  const buyerFeeLines = feeLines.filter(
    (feeLine): feeLine is Quote["buyerFeeLines"][number] => feeLine.payer === "BUYER",
  );
  const organizerFeeLines = feeLines.filter(
    (feeLine): feeLine is Quote["organizerFeeLines"][number] => feeLine.payer === "EVENT_ORGANIZER",
  );
  const buyerFeeAmount = sumAmounts(buyerFeeLines);
  const organizerFeeAmount = sumAmounts(organizerFeeLines);
  const subtotalAmount = offerRate.price * selection.quantity;

  return {
    eventId: selection.eventId,
    saleWindow: {
      id: saleWindow.id,
      method: saleWindow.method,
      applicationStartsAt: saleWindow.applicationStartsAt,
      applicationEndsAt: saleWindow.applicationEndsAt,
      canceledAt: saleWindow.canceledAt,
    },
    offer: {
      id: offer.id,
      maxQuantityPerOrder: offer.maxQuantityPerOrder,
    },
    offerRate: {
      id: offerRate.id,
      price: offerRate.price,
      currency: offerRate.currency,
      minQuantity: offerRate.minQuantity,
      maxQuantity: offerRate.maxQuantity,
      quantityStep: offerRate.quantityStep,
    },
    entitlements: entitlements.map((entitlement) => ({
      id: entitlement.id,
      performanceId: entitlement.performanceId ?? entitlement.inventoryPool.performanceId,
      inventoryPoolId: entitlement.inventoryPoolId,
    })),
    unitPrice: offerRate.price,
    quantity: selection.quantity,
    subtotalAmount,
    buyerFeeLines,
    organizerFeeLines,
    buyerFeeAmount,
    organizerFeeAmount,
    totalAmount: subtotalAmount + buyerFeeAmount,
    currency: offerRate.currency,
  };
}

export async function createPaidFirstComeOrder(input: { userId: string; quote: Quote }) {
  const now = new Date();

  if (input.quote.saleWindow.method !== "FIRST_COME") {
    throw new ORPCError("BAD_REQUEST", {
      message: "先着販売ではないため即時購入できません",
    });
  }

  if (
    input.quote.saleWindow.applicationStartsAt > now ||
    input.quote.saleWindow.applicationEndsAt < now
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "販売期間外です",
    });
  }

  return await db.$transaction(async (tx) => {
    const allocatedUnitsByEntitlement = await allocateInventoryUnits(tx, input.quote);
    const order = await tx.order.create({
      data: {
        userId: input.userId,
        status: "PAID",
        subtotalAmount: input.quote.subtotalAmount,
        feeAmount: input.quote.buyerFeeAmount + input.quote.organizerFeeAmount,
        buyerFeeAmount: input.quote.buyerFeeAmount,
        organizerFeeAmount: input.quote.organizerFeeAmount,
        totalAmount: input.quote.totalAmount,
        currency: input.quote.currency,
      },
    });
    const orderItem = await tx.orderItem.create({
      data: {
        orderId: order.id,
        saleOfferRateId: input.quote.offerRate.id,
        quantity: input.quote.quantity,
        unitPrice: input.quote.unitPrice,
      },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: "mock",
        providerPaymentId: `mock-${crypto.randomUUID()}`,
        amount: input.quote.totalAmount,
        currency: input.quote.currency,
        status: "SUCCEEDED",
      },
    });

    await createOrderFeeLines(tx, {
      orderId: order.id,
      orderItemId: orderItem.id,
      quote: input.quote,
    });

    for (let ticketIndex = 0; ticketIndex < input.quote.quantity; ticketIndex += 1) {
      await tx.ticket.create({
        data: {
          orderItemId: orderItem.id,
          ownerUserId: input.userId,
          status: "ACTIVE",
          serialNumber: buildSerialNumber(ticketIndex),
          qrToken: crypto.randomUUID(),
          ticketEntitlements: {
            create: input.quote.entitlements.map((entitlement) => {
              const allocatedUnit = allocatedUnitsByEntitlement.get(entitlement.id)?.[ticketIndex];

              if (!allocatedUnit) {
                throw new ORPCError("CONFLICT", {
                  message: "在庫の確保に失敗しました",
                });
              }

              return {
                performanceId: entitlement.performanceId,
                saleOfferEntitlementId: entitlement.id,
                inventoryUnitId: allocatedUnit.id,
              };
            }),
          },
        },
      });
    }

    return order;
  });
}

async function allocateInventoryUnits(tx: Prisma.TransactionClient, quote: Quote) {
  const allocatedUnitsByEntitlement = new Map<string, { id: string }[]>();

  for (const entitlement of quote.entitlements) {
    const units = await tx.inventoryUnit.findMany({
      where: {
        inventoryPoolId: entitlement.inventoryPoolId,
        status: "AVAILABLE",
      },
      orderBy: [
        {
          entryNumber: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      take: quote.quantity,
      select: {
        id: true,
      },
    });

    if (units.length < quote.quantity) {
      throw new ORPCError("CONFLICT", {
        message: "販売可能な在庫が不足しています",
      });
    }

    const updateResult = await tx.inventoryUnit.updateMany({
      where: {
        id: {
          in: units.map((unit) => unit.id),
        },
        status: "AVAILABLE",
      },
      data: {
        status: "SOLD",
      },
    });

    if (updateResult.count !== units.length) {
      throw new ORPCError("CONFLICT", {
        message: "販売可能な在庫が不足しています",
      });
    }

    await tx.inventoryPool.update({
      where: {
        id: entitlement.inventoryPoolId,
      },
      data: {
        soldCount: {
          increment: quote.quantity,
        },
      },
    });

    allocatedUnitsByEntitlement.set(entitlement.id, units);
  }

  return allocatedUnitsByEntitlement;
}

async function createOrderFeeLines(
  tx: Prisma.TransactionClient,
  input: { orderId: string; orderItemId: string; quote: Quote },
) {
  const feeLines = [
    ...input.quote.buyerFeeLines.map((feeLine) => ({ ...feeLine, payer: "BUYER" as const })),
    ...input.quote.organizerFeeLines.map((feeLine) => ({
      ...feeLine,
      payer: "EVENT_ORGANIZER" as const,
    })),
  ];

  if (feeLines.length === 0) {
    return;
  }

  await tx.orderFeeLine.createMany({
    data: feeLines.map((feeLine) => ({
      orderId: input.orderId,
      orderItemId: input.orderItemId,
      feeRuleId: feeLine.id,
      name: feeLine.name,
      displayOrder: 0,
      payer: feeLine.payer,
      rateBasisPoints: 0,
      flatAmount: feeLine.amount / input.quote.quantity,
      currency: input.quote.currency,
      unitBaseAmount: input.quote.unitPrice,
      quantity: input.quote.quantity,
      feeAmount: feeLine.amount,
    })),
  });
}

async function getApplicableFeeRules(input: {
  eventId: string;
  saleWindowId: string;
  saleOfferId: string;
}) {
  const now = new Date();

  return await db.feeRule.findMany({
    where: {
      eventId: input.eventId,
      disabledAt: {
        gt: now,
      },
      OR: [
        {
          saleOfferId: input.saleOfferId,
        },
        {
          saleWindowId: input.saleWindowId,
          saleOfferId: null,
        },
        {
          saleWindowId: null,
          saleOfferId: null,
        },
      ],
    },
    orderBy: {
      displayOrder: "asc",
    },
  });
}

function filterEntitlementsByPerformance(input: {
  entitlements: {
    id: string;
    performanceId: string | null;
    inventoryPoolId: string;
    inventoryPool: {
      performanceId: string;
    };
  }[];
  performanceId?: string;
}) {
  if (!input.performanceId) {
    return input.entitlements;
  }

  return input.entitlements.filter(
    (entitlement) =>
      (entitlement.performanceId ?? entitlement.inventoryPool.performanceId) ===
      input.performanceId,
  );
}

function validateQuantity(input: {
  quantity: number;
  offerMaxQuantity: number;
  rateMinQuantity: number;
  rateMaxQuantity: number;
  quantityStep: number;
}) {
  const maxQuantity = Math.min(input.offerMaxQuantity, input.rateMaxQuantity);

  if (input.quantity < input.rateMinQuantity || input.quantity > maxQuantity) {
    throw new ORPCError("BAD_REQUEST", {
      message: `枚数は${input.rateMinQuantity}枚から${maxQuantity}枚まで選択できます`,
    });
  }

  if ((input.quantity - input.rateMinQuantity) % input.quantityStep !== 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: `${input.quantityStep}枚単位で選択してください`,
    });
  }
}

function toFeeLine(feeRule: FeeRuleForQuote, unitPrice: number, quantity: number) {
  const amount =
    (Math.floor((unitPrice * feeRule.rateBasisPoints) / 10_000) + feeRule.flatAmount) * quantity;

  return {
    id: feeRule.id,
    name: feeRule.name,
    payer: feeRule.payer,
    amount,
  };
}

function sumAmounts(lines: { amount: number }[]) {
  return lines.reduce((total, line) => total + line.amount, 0);
}

function buildSerialNumber(ticketIndex: number) {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();

  return `TKT-${randomPart}-${ticketIndex + 1}`;
}
