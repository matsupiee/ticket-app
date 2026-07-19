import { z } from "zod";

import { adjustInventoryHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const adjustInventoryInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  performanceId: z.string().min(1),
  seatCategoryId: z.string().min(1),
  admissionMethod: z.enum(["GENERAL_ADMISSION", "NUMBERED_ENTRY", "RESERVED_SEAT"]),
  seatAllocationMethod: z.enum(["NONE", "LOTTERY_LATER", "IMMEDIATE"]),
  capacityDelta: z.number().int(),
  reason: z.string().min(1),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const adjustInventoryRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/events/{eventId}/inventory-adjustments",
    summary: "Adjust inventory",
  })
  .input(adjustInventoryInputSchema)
  .output(mutationOutputSchema)
  .handler(adjustInventoryHandler);
