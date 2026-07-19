import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { createPaidFirstComeOrder, quoteTicketSelection } from "../../../../shared/ticketing";

export async function submitApplicationHandler({
  input,
  context,
}: {
  input: {
    eventId: string;
    saleWindowId: string;
    preferences: {
      preferenceRank: number;
      performanceId?: string;
      offerId: string;
      items: {
        rateTypeId: string;
        quantity: number;
      }[];
    }[];
  };
  context: {
    session: {
      user: {
        id: string;
      };
    };
  };
}) {
  const preference = input.preferences[0];
  const item = preference?.items[0];

  if (!preference || !item || input.preferences.length !== 1 || preference.items.length !== 1) {
    throw new ORPCError("BAD_REQUEST", {
      message: "現在は1公演1券種1料金種別の申し込みに対応しています",
    });
  }

  const quote = await quoteTicketSelection({
    eventId: input.eventId,
    saleWindowId: input.saleWindowId,
    performanceId: preference.performanceId,
    offerId: preference.offerId,
    rateTypeId: item.rateTypeId,
    quantity: item.quantity,
  });

  if (quote.saleWindow.method === "FIRST_COME") {
    const order = await createPaidFirstComeOrder({
      userId: context.session.user.id,
      quote,
    });

    return {
      orderId: order.id,
      status: "ORDER_CREATED" as const,
      orderStatus: order.status,
      subtotalAmount: quote.subtotalAmount,
      buyerFeeAmount: quote.buyerFeeAmount,
      organizerFeeAmount: quote.organizerFeeAmount,
      totalAmount: quote.totalAmount,
      currency: quote.currency,
    };
  }

  const application = await db.application.create({
    data: {
      userId: context.session.user.id,
      saleWindowId: input.saleWindowId,
      status: "APPLIED",
      applicationPreferences: {
        create: {
          saleOfferId: preference.offerId,
          preferenceRank: preference.preferenceRank,
          applicationPreferenceItems: {
            create: {
              saleOfferRateId: quote.offerRate.id,
              quantity: item.quantity,
              saleOfferId: preference.offerId,
            },
          },
        },
      },
    },
  });

  return {
    applicationId: application.id,
    status: "APPLICATION_RECEIVED" as const,
    subtotalAmount: quote.subtotalAmount,
    buyerFeeAmount: quote.buyerFeeAmount,
    organizerFeeAmount: quote.organizerFeeAmount,
    totalAmount: quote.totalAmount,
    currency: quote.currency,
  };
}
