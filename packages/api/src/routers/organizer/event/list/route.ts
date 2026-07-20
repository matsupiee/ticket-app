import { z } from "zod";

import { listOrganizerEventsHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const eventSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  status: z.enum(["DRAFT", "ON_SALE", "ENDED", "CANCELED"]),
  location: z.string().min(1),
  tags: z.array(z.string().min(1)),
  performances: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      venueName: z.string().min(1),
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
      offers: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          seatCategoryName: z.string().min(1),
          soldQuantity: z.number().int().min(0),
          availableQuantity: z.number().int().min(0),
          minPrice: z.number().int().min(0),
          maxQuantityPerOrder: z.number().int().min(1),
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

const listEventsInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  query: z.string().trim().min(1).optional(),
  status: z.enum(["DRAFT", "ON_SALE", "ENDED", "CANCELED"]).optional(),
});

const listEventsOutputSchema = z.object({
  items: z.array(eventSummarySchema),
  summary: z.object({
    eventCount: z.number().int().min(0),
    onSaleEventCount: z.number().int().min(0),
    ticketsSold: z.number().int().min(0),
    grossSales: z.number().int().min(0),
    organizerFeeAmount: z.number().int().min(0),
    settlementAmount: z.number().int().min(0),
  }),
  nextCursor: z.string().min(1).optional(),
});

export const listEventsRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/events",
    summary: "List organizer events",
  })
  .input(listEventsInputSchema)
  .output(listEventsOutputSchema)
  .handler(listOrganizerEventsHandler);
