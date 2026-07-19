import { z } from "zod";

import { removeMemberHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const removeMemberInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  memberId: z.string().min(1),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const removeMemberRoute = protectedProcedure
  .route({
    method: "DELETE",
    path: "/organizer/account/members/{memberId}",
    summary: "Remove organizer member",
  })
  .input(removeMemberInputSchema)
  .output(mutationOutputSchema)
  .handler(removeMemberHandler);
