import { z } from "zod";

import { listPlatformOrganizersHandler } from "../../../handlers/platform/list-organizers";
import { protectedProcedure } from "../../../index";

const listOrganizersInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  query: z.string().trim().min(1).optional(),
  status: z.enum(["UNDER_REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
});

const listOrganizersOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      slug: z.string().min(1),
      status: z.enum(["UNDER_REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"]),
      location: z.string().min(1).optional(),
      eventCount: z.number().int().min(0),
      grossSales: z.number().int().min(0),
      platformFeeAmount: z.number().int().min(0),
      payoutAmount: z.number().int().min(0),
      riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
    }),
  ),
  nextCursor: z.string().min(1).optional(),
});

export const listOrganizersRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/platform/organizers",
    summary: "List platform organizers",
  })
  .input(listOrganizersInputSchema)
  .output(listOrganizersOutputSchema)
  .handler(listPlatformOrganizersHandler);
