import { z } from "zod";

import { getSalesDashboardHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const getDashboardInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

const getDashboardOutputSchema = z.object({
  summary: z.object({
    eventCount: z.number().int().min(0),
    onSaleEventCount: z.number().int().min(0),
    ticketsSold: z.number().int().min(0),
    grossSales: z.number().int().min(0),
    organizerFeeAmount: z.number().int().min(0),
    settlementAmount: z.number().int().min(0),
  }),
  eventSales: z.array(
    z.object({
      eventId: z.string().min(1),
      eventName: z.string().min(1),
      status: z.enum(["DRAFT", "ON_SALE", "ENDED", "CANCELED"]),
      grossSales: z.number().int().min(0),
      ticketsSold: z.number().int().min(0),
      buyerFeeAmount: z.number().int().min(0),
      organizerFeeAmount: z.number().int().min(0),
      settlementAmount: z.number().int().min(0),
    }),
  ),
});

export const getDashboardRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/sales",
    summary: "Get organizer sales dashboard",
  })
  .input(getDashboardInputSchema)
  .output(getDashboardOutputSchema)
  .handler(getSalesDashboardHandler);
