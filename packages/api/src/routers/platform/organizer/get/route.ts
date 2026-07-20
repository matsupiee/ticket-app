import { z } from "zod";

import { getPlatformOrganizerHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const getOrganizerInputSchema = z.object({
  organizerId: z.string().min(1),
});

const getOrganizerOutputSchema = z.object({
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
  inquiryEmail: z.string().email().optional(),
  inquiryPhoneNumber: z.string().min(1).optional(),
  members: z.array(
    z.object({
      id: z.string().min(1),
      userId: z.string().min(1),
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["VIEWER", "EDITOR"]),
    }),
  ),
  events: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
      status: z.enum(["DRAFT", "ON_SALE", "ENDED", "CANCELED"]),
      location: z.string().min(1),
      tags: z.array(z.string().min(1)),
    }),
  ),
  bankAccount: z
    .object({
      id: z.string().min(1),
      accountType: z.enum(["ORDINARY", "CURRENT", "SAVINGS", "OTHER"]),
      accountNumber: z.string().min(1),
      bankName: z.string().min(1),
      bankCode: z.string().min(1),
      branchName: z.string().min(1),
      branchCode: z.string().min(1),
      holderName: z.string().min(1),
    })
    .optional(),
});

export const getOrganizerRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/platform/organizers/{organizerId}",
    summary: "Get platform organizer detail",
  })
  .input(getOrganizerInputSchema)
  .output(getOrganizerOutputSchema)
  .handler(getPlatformOrganizerHandler);
