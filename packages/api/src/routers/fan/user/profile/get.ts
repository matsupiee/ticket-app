import { z } from "zod";

import { getProfileHandler } from "../../../../handlers/profile/get-profile";
import { protectedProcedure } from "../../../../index";

const profileOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  phoneNumberVerified: z.boolean(),
});

export const getProfileRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/fan/user/profile",
    summary: "Get fan profile",
  })
  .output(profileOutputSchema)
  .handler(getProfileHandler);
