import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const accountUpsertBankAccountInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  accountType: z.enum(["ORDINARY", "CURRENT", "SAVINGS", "OTHER"]),
  accountNumber: z.string().min(1),
  bankName: z.string().min(1),
  bankCode: z.string().min(1),
  branchName: z.string().min(1),
  branchCode: z.string().min(1),
  holderName: z.string().min(1),
});

const accountUpsertBankAccountOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const accountUpsertBankAccountRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/account/bank-account",
    summary: "Upsert organizer bank account",
  })
  .input(accountUpsertBankAccountInputSchema)
  .output(accountUpsertBankAccountOutputSchema)
  .handler(handler);
