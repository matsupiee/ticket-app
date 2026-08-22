import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const accountInviteMemberInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["VIEWER", "EDITOR"]),
});

const accountInviteMemberOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const accountInviteMemberRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/account/members/invitations",
    summary: "Invite organizer member",
  })
  .input(accountInviteMemberInputSchema)
  .output(accountInviteMemberOutputSchema)
  .handler(handler);
