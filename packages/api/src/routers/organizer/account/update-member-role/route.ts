import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const accountUpdateMemberRoleInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["VIEWER", "EDITOR"]),
});

const accountUpdateMemberRoleOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const accountUpdateMemberRoleRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/organizer/account/members/{memberId}",
    summary: "Update organizer member role",
  })
  .input(accountUpdateMemberRoleInputSchema)
  .output(accountUpdateMemberRoleOutputSchema)
  .handler(handler);
