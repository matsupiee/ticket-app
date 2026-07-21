import { z } from "zod";

import { getOrganizerEventHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const getEventInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
});

const getEventOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  status: z.enum(["DRAFT", "ON_SALE", "ENDED", "CANCELED"]),
  location: z.string().min(1),
  tags: z.array(z.string().min(1)),
  seatCategories: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
      active: z.boolean(),
      displayOrder: z.number().int().min(0),
    }),
  ),
  rateTypes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      displayOrder: z.number().int().min(0),
    }),
  ),
  inventoryPools: z.array(
    z.object({
      id: z.string().min(1),
      performanceId: z.string().min(1),
      seatCategoryId: z.string().min(1),
      admissionMethod: z.enum(["GENERAL_ADMISSION", "NUMBERED_ENTRY", "RESERVED_SEAT"]),
      seatAllocationMethod: z.enum(["NONE", "LOTTERY_LATER", "IMMEDIATE"]),
      capacity: z.number().int().min(0),
      heldCount: z.number().int().min(0),
      soldCount: z.number().int().min(0),
    }),
  ),
  performances: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      venueName: z.string().min(1),
      venueId: z.string().min(1),
      seatLayoutId: z.string().min(1).optional(),
      startsAt: z.string().min(1),
      doorsOpenAt: z.string().min(1),
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
      publishesAt: z.string().min(1).optional(),
      isSmsAuthRequired: z.boolean(),
      lotteryMode: z.enum(["MANUAL", "AUTO"]),
      notifyLotteryResultAt: z.string().min(1).optional(),
      canceledAt: z.string().min(1).optional(),
      cancelReason: z.string().min(1).optional(),
      offers: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          description: z.string(),
          displayOrder: z.number().int().min(0),
          seatCategoryName: z.string().min(1),
          soldQuantity: z.number().int().min(0),
          availableQuantity: z.number().int().min(0),
          minPrice: z.number().int().min(0),
          maxQuantityPerOrder: z.number().int().min(1),
          rates: z.array(
            z.object({
              id: z.string().min(1),
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
              id: z.string().min(1),
              performanceId: z.string().min(1),
              seatCategoryId: z.string().min(1),
            }),
          ),
        }),
      ),
    }),
  ),
  sales: z.object({
    grossSales: z.number().int().min(0),
    ticketsSold: z.number().int().min(0),
    buyerFeeAmount: z.number().int().min(0),
    organizerFeeAmount: z.number().int().min(0),
  }),
  settlement: z.object({
    status: z.enum(["SCHEDULED", "PROCESSING", "PAID"]),
    scheduledAt: z.string().min(1),
    paidAt: z.string().min(1).optional(),
  }),
});

export type GetEventInput = z.infer<typeof getEventInputSchema>;
export type GetEventOutput = z.infer<typeof getEventOutputSchema>;

export const getEventRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/events/{eventId}",
    summary: "Get organizer event detail",
  })
  .input(getEventInputSchema)
  .output(getEventOutputSchema)
  .handler(getOrganizerEventHandler);
