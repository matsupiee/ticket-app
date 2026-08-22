import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../../index";

const userProfileGetOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  phoneNumberVerified: z.boolean(),
});

export const userProfileGetRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/fan/user/profile",
    summary: "Get fan profile",
  })
  .output(userProfileGetOutputSchema)
  .handler(handler);
