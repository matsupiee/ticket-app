import { z } from "zod";

import { listMonthlySalesHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const listMonthlySalesInputSchema = z.object({
  fromMonth: z.string().min(7).max(7).optional(),
  toMonth: z.string().min(7).max(7).optional(),
});

const monthlySalesSchema = z.object({
  month: z.string().min(7).max(7),
  grossSales: z.number().int().min(0),
  platformFeeAmount: z.number().int().min(0),
  payoutAmount: z.number().int().min(0),
  applications: z.number().int().min(0),
});

const listMonthlySalesOutputSchema = z.object({
  items: z.array(monthlySalesSchema),
  summary: z.object({
    grossSales: z.number().int().min(0),
    platformFeeAmount: z.number().int().min(0),
    payoutAmount: z.number().int().min(0),
    applications: z.number().int().min(0),
  }),
});

export const listMonthlySalesRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/platform/monthly-sales",
    summary: "List platform monthly sales",
  })
  .input(listMonthlySalesInputSchema)
  .output(listMonthlySalesOutputSchema)
  .handler(listMonthlySalesHandler);
