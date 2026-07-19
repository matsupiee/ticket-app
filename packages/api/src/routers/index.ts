import type { RouterClient } from "@orpc/server";

import { getPrivateDataHandler } from "../handlers/system/get-private-data";
import { healthCheckHandler } from "../handlers/system/health-check";
import { protectedProcedure, publicProcedure } from "../index";
import { fanRouter } from "./fan";
import { organizerRouter } from "./organizer";
import { platformRouter } from "./platform";

export const appRouter = {
  healthCheck: publicProcedure
    .route({
      method: "GET",
      path: "/health",
      summary: "Health check",
    })
    .handler(healthCheckHandler),
  privateData: protectedProcedure.handler(getPrivateDataHandler),
  fan: fanRouter,
  organizer: organizerRouter,
  platform: platformRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
