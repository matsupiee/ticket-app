import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../../index";

const userVerifyPhoneRequestInputSchema = z.object({
  phoneNumber: z.string().min(1),
});

const userVerifyPhoneRequestOutputSchema = z.object({
  verificationId: z.string().min(1),
  expiresAt: z.string().min(1),
});

export const userVerifyPhoneRequestRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/fan/user/verify-phone/request",
    summary: "Request fan phone verification",
  })
  .input(userVerifyPhoneRequestInputSchema)
  .output(userVerifyPhoneRequestOutputSchema)
  .handler(handler);
