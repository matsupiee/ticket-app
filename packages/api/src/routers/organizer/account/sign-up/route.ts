import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const accountSignUpInputSchema = z.object({
  organizerName: z.string().min(1),
});

const accountSignUpOutputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export const accountSignUpRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/account/sign-up",
    summary: "Sign up current user's organizer account",
  })
  .input(accountSignUpInputSchema)
  .output(accountSignUpOutputSchema)
  .handler(handler);
