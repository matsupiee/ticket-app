import { z } from "zod";

import { upsertSaleOfferHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const upsertSaleOfferInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  saleWindowId: z.string().min(1),
  saleOfferId: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string(),
  maxQuantityPerOrder: z.number().int().min(1),
  displayOrder: z.number().int().min(0),
  rates: z.array(
    z.object({
      rateTypeId: z.string().min(1),
      price: z.number().int().min(0),
      currency: z.string().length(3),
      minQuantity: z.number().int().min(1),
      maxQuantity: z.number().int().min(1),
      quantityStep: z.number().int().min(1),
      displayOrder: z.number().int().min(0),
    }),
  ),
  entitlements: z.array(
    z.object({
      performanceId: z.string().min(1),
      seatCategoryId: z.string().min(1),
    }),
  ),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type UpsertSaleOfferInput = z.infer<typeof upsertSaleOfferInputSchema>;
export type UpsertSaleOfferOutput = z.infer<typeof mutationOutputSchema>;

export const upsertSaleOfferRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/events/{eventId}/sale-offers",
    summary: "Upsert sale offer",
  })
  .input(upsertSaleOfferInputSchema)
  .output(mutationOutputSchema)
  .handler(upsertSaleOfferHandler);
