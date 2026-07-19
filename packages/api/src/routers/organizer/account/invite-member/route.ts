import { z } from "zod";

import { inviteMemberHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const inviteMemberInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["VIEWER", "EDITOR"]),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const inviteMemberRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/account/members/invitations",
    summary: "Invite organizer member",
  })
  .input(inviteMemberInputSchema)
  .output(mutationOutputSchema)
  .handler(inviteMemberHandler);
