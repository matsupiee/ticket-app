import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const accountUpdateProfileInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  inquiryEmail: z.string().email().optional(),
  inquiryPhoneNumber: z.string().min(1).optional(),
});

const accountUpdateProfileOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const accountUpdateProfileRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/organizer/account/profile",
    summary: "Update organizer profile",
  })
  .input(accountUpdateProfileInputSchema)
  .output(accountUpdateProfileOutputSchema)
  .handler(handler);
