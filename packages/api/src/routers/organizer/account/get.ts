import { z } from "zod";

import { getAccountHandler } from "../../../handlers/organizer-account/get-account";
import { protectedProcedure } from "../../../index";

const getAccountInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
});

const getAccountOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
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

export const getAccountRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/account",
    summary: "Get organizer account",
  })
  .input(getAccountInputSchema)
  .output(getAccountOutputSchema)
  .handler(getAccountHandler);
