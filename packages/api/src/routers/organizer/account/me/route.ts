import { z } from "zod";

import { getMyOrganizerAccountHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const getMyOrganizerAccountInputSchema = z.object({});

const getMyOrganizerAccountOutputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export const getMyOrganizerAccountRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/account/me",
    summary: "Get current organizer account",
  })
  .input(getMyOrganizerAccountInputSchema)
  .output(getMyOrganizerAccountOutputSchema)
  .handler(getMyOrganizerAccountHandler);
