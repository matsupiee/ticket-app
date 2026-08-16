import { z } from "zod";

import { getMyPlatformAccountHandler } from "./handler";
import { platformProcedure } from "../../../../index";

const getMyPlatformAccountInputSchema = z.object({});

const getMyPlatformAccountOutputSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(["OWNER", "OPERATOR", "VIEWER"]),
});

export const getMyPlatformAccountRoute = platformProcedure
  .route({
    method: "GET",
    path: "/platform/account/me",
    summary: "Get current platform account",
  })
  .input(getMyPlatformAccountInputSchema)
  .output(getMyPlatformAccountOutputSchema)
  .handler(getMyPlatformAccountHandler);
