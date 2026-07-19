import { z } from "zod";

import { upsertBankAccountHandler } from "../../../handlers/organizer-account/upsert-bank-account";
import { protectedProcedure } from "../../../index";

const upsertBankAccountInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  accountType: z.enum(["ORDINARY", "CURRENT", "SAVINGS", "OTHER"]),
  accountNumber: z.string().min(1),
  bankName: z.string().min(1),
  bankCode: z.string().min(1),
  branchName: z.string().min(1),
  branchCode: z.string().min(1),
  holderName: z.string().min(1),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const upsertBankAccountRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/account/bank-account",
    summary: "Upsert organizer bank account",
  })
  .input(upsertBankAccountInputSchema)
  .output(mutationOutputSchema)
  .handler(upsertBankAccountHandler);
