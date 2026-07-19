import { z } from "zod";

import { quoteApplicationHandler } from "./handler";
import { publicProcedure } from "../../../../index";

const quoteApplicationInputSchema = z.object({
  eventId: z.string().min(1),
  saleWindowId: z.string().min(1),
  performanceId: z.string().min(1),
  offerId: z.string().min(1),
  rateTypeId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const feeLineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  payer: z.enum(["BUYER", "EVENT_ORGANIZER"]),
  amount: z.number().int().min(0),
});

const quoteApplicationOutputSchema = z.object({
  unitPrice: z.number().int().min(0),
  quantity: z.number().int().min(1),
  subtotalAmount: z.number().int().min(0),
  buyerFeeLines: z.array(feeLineSchema),
  organizerFeeLines: z.array(feeLineSchema),
  buyerFeeAmount: z.number().int().min(0),
  organizerFeeAmount: z.number().int().min(0),
  totalAmount: z.number().int().min(0),
  currency: z.string().length(3),
});

export const quoteApplicationRoute = publicProcedure
  .route({
    method: "POST",
    path: "/fan/events/{eventId}/application-quote",
    summary: "Quote a fan ticket application",
  })
  .input(quoteApplicationInputSchema)
  .output(quoteApplicationOutputSchema)
  .handler(quoteApplicationHandler);
