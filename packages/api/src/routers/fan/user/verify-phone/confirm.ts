import { z } from "zod";

import { verifyPhoneHandler } from "../../../../handlers/profile/verify-phone";
import { protectedProcedure } from "../../../../index";

const verifyPhoneInputSchema = z.object({
  verificationId: z.string().min(1),
  code: z.string().min(4).max(10),
});

const verifyPhoneOutputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  phoneNumberVerified: z.boolean(),
});

export const verifyPhoneRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/fan/user/verify-phone/confirm",
    summary: "Verify fan phone number",
  })
  .input(verifyPhoneInputSchema)
  .output(verifyPhoneOutputSchema)
  .handler(verifyPhoneHandler);
