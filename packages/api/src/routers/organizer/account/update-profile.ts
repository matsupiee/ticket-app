import { z } from "zod";

import { updateOrganizerProfileHandler } from "../../../handlers/organizer-account/update-profile";
import { protectedProcedure } from "../../../index";

const updateProfileInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  inquiryEmail: z.string().email().optional(),
  inquiryPhoneNumber: z.string().min(1).optional(),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const updateProfileRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/organizer/account/profile",
    summary: "Update organizer profile",
  })
  .input(updateProfileInputSchema)
  .output(mutationOutputSchema)
  .handler(updateOrganizerProfileHandler);
