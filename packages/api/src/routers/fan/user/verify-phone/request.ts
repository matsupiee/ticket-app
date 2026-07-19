import { z } from "zod";

import { requestPhoneVerificationHandler } from "../../../../handlers/profile/request-phone-verification";
import { protectedProcedure } from "../../../../index";

const requestPhoneVerificationInputSchema = z.object({
  phoneNumber: z.string().min(1),
});

const requestPhoneVerificationOutputSchema = z.object({
  verificationId: z.string().min(1),
  expiresAt: z.string().min(1),
});

export const requestPhoneVerificationRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/fan/user/verify-phone/request",
    summary: "Request fan phone verification",
  })
  .input(requestPhoneVerificationInputSchema)
  .output(requestPhoneVerificationOutputSchema)
  .handler(requestPhoneVerificationHandler);
