import { z } from "zod";

import { updateProfileHandler } from "../../../../handlers/profile/update-profile";
import { protectedProcedure } from "../../../../index";

const updateProfileInputSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().min(1).optional(),
});

const updateProfileOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  phoneNumberVerified: z.boolean(),
});

export const updateProfileRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/fan/user/profile",
    summary: "Update fan profile",
  })
  .input(updateProfileInputSchema)
  .output(updateProfileOutputSchema)
  .handler(updateProfileHandler);
