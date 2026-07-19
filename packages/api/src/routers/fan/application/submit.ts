import { z } from "zod";

import { submitApplicationHandler } from "../../../handlers/application/submit-application";
import { protectedProcedure } from "../../../index";

const submitApplicationInputSchema = z.object({
  eventId: z.string().min(1),
  saleWindowId: z.string().min(1),
  preferences: z
    .array(
      z.object({
        preferenceRank: z.number().int().min(1),
        performanceId: z.string().min(1).optional(),
        offerId: z.string().min(1),
        items: z
          .array(
            z.object({
              rateTypeId: z.string().min(1),
              quantity: z.number().int().min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1)
    .max(10),
});

const submitApplicationOutputSchema = z.object({
  applicationId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  status: z.enum(["APPLICATION_RECEIVED", "ORDER_CREATED"]),
  orderStatus: z.enum(["PENDING", "PAID", "CANCELED", "EXPIRED", "REFUNDED"]).optional(),
  subtotalAmount: z.number().int().min(0),
  buyerFeeAmount: z.number().int().min(0),
  organizerFeeAmount: z.number().int().min(0),
  totalAmount: z.number().int().min(0),
  currency: z.string().length(3),
});

export const submitApplicationRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/fan/applications",
    summary: "Submit a fan ticket application",
  })
  .input(submitApplicationInputSchema)
  .output(submitApplicationOutputSchema)
  .handler(submitApplicationHandler);
