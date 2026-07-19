import { z } from "zod";

import { signUpOrganizerAccountHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const signUpOrganizerAccountInputSchema = z.object({
  organizerName: z.string().min(1),
});

const signUpOrganizerAccountOutputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export const signUpOrganizerAccountRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/account/sign-up",
    summary: "Sign up current user's organizer account",
  })
  .input(signUpOrganizerAccountInputSchema)
  .output(signUpOrganizerAccountOutputSchema)
  .handler(signUpOrganizerAccountHandler);
