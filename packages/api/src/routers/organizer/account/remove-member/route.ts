import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const accountRemoveMemberInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  memberId: z.string().min(1),
});

const accountRemoveMemberOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const accountRemoveMemberRoute = protectedProcedure
  .route({
    method: "DELETE",
    path: "/organizer/account/members/{memberId}",
    summary: "Remove organizer member",
  })
  .input(accountRemoveMemberInputSchema)
  .output(accountRemoveMemberOutputSchema)
  .handler(handler);
