import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../../index";

const userVerifyPhoneConfirmInputSchema = z.object({
  verificationId: z.string().min(1),
  code: z.string().min(4).max(10),
});

const userVerifyPhoneConfirmOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  phoneNumberVerified: z.boolean(),
});

export const userVerifyPhoneConfirmRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/fan/user/verify-phone/confirm",
    summary: "Verify fan phone number",
  })
  .input(userVerifyPhoneConfirmInputSchema)
  .output(userVerifyPhoneConfirmOutputSchema)
  .handler(handler);
