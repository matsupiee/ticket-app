import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../../index";

const userProfileUpdateInputSchema = z.object({
  name: z.string().min(1),
  birthDate: z.string().min(1).optional(),
});

const userProfileUpdateOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  phoneNumberVerified: z.boolean(),
});

export const userProfileUpdateRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/fan/user/profile",
    summary: "Update fan profile",
  })
  .input(userProfileUpdateInputSchema)
  .output(userProfileUpdateOutputSchema)
  .handler(handler);
