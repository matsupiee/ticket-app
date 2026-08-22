import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const accountMeInputSchema = z.object({});

const accountMeOutputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export const accountMeRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/account/me",
    summary: "Get current organizer account",
  })
  .input(accountMeInputSchema)
  .output(accountMeOutputSchema)
  .handler(handler);
