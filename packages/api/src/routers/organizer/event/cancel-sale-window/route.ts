import { z } from "zod";

import { cancelSaleWindowHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const cancelSaleWindowInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  saleWindowId: z.string().min(1),
  cancelReason: z.string().min(1),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const cancelSaleWindowRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/events/{eventId}/sale-windows/{saleWindowId}/cancel",
    summary: "Cancel sale window",
  })
  .input(cancelSaleWindowInputSchema)
  .output(mutationOutputSchema)
  .handler(cancelSaleWindowHandler);
