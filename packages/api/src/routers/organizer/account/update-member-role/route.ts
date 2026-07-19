import { z } from "zod";

import { updateMemberRoleHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const updateMemberRoleInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["VIEWER", "EDITOR"]),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const updateMemberRoleRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/organizer/account/members/{memberId}",
    summary: "Update organizer member role",
  })
  .input(updateMemberRoleInputSchema)
  .output(mutationOutputSchema)
  .handler(updateMemberRoleHandler);
