import { z } from "zod";

import { getEventHandler } from "./handler";
import { publicProcedure } from "../../../../index";

const getEventInputSchema = z.object({
  eventId: z.string().min(1),
});

const eventOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  eventOrganizerName: z.string().min(1),
  location: z.string().min(1),
  imageUrl: z.string().min(1),
  tags: z.array(z.string().min(1)),
  rateTypes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      displayOrder: z.number().int().min(0).optional(),
    }),
  ),
  performances: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      venueName: z.string().min(1),
      doorsOpenAt: z.string().min(1),
      startsAt: z.string().min(1),
      admissionMethod: z.enum(["GENERAL_ADMISSION", "NUMBERED_ENTRY", "RESERVED_SEAT"]),
    }),
  ),
  saleWindows: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      saleMethod: z.enum(["FIRST_COME", "LOTTERY"]),
      opensAt: z.string().min(1),
      closesAt: z.string().min(1),
      isSmsAuthRequired: z.boolean(),
      offers: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          seatCategoryName: z.string().min(1),
          description: z.string(),
          maxQuantityPerOrder: z.number().int().min(1),
          availableQuantity: z.number().int().min(0),
          performanceIds: z.array(z.string().min(1)).min(1),
          rates: z.array(
            z.object({
              rateTypeId: z.string().min(1),
              price: z.number().int().min(0),
              currency: z.string().length(3),
              minQuantity: z.number().int().min(1),
              maxQuantity: z.number().int().min(1),
              quantityStep: z.number().int().min(1),
            }),
          ),
        }),
      ),
      feeRules: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          payer: z.enum(["BUYER", "EVENT_ORGANIZER"]),
          currency: z.string().length(3),
          rateBasisPoints: z.number().int().min(0),
          flatAmount: z.number().int().min(0),
          displayOrder: z.number().int().min(0),
        }),
      ),
    }),
  ),
});

export const getEventRoute = publicProcedure
  .route({
    method: "GET",
    path: "/fan/events/{eventId}",
    summary: "Get fan-visible event detail",
  })
  .input(getEventInputSchema)
  .output(eventOutputSchema)
  .handler(getEventHandler);
