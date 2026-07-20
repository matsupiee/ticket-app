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
  performances: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      venueName: z.string().min(1),
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
      offers: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          seatCategoryName: z.string().min(1),
          soldQuantity: z.number().int().min(0),
          availableQuantity: z.number().int().min(0),
          minPrice: z.number().int().min(0),
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

export const getEventRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/events/{eventId}",
    summary: "Get organizer event detail",
  })
  .input(getEventInputSchema)
  .output(getEventOutputSchema)
  .handler(getOrganizerEventHandler);
