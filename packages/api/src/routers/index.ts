import type { RouterClient } from "@orpc/server";

import { fanRouter } from "./fan";
import { organizerRouter } from "./organizer";
import { platformRouter } from "./platform";

export const appRouter = {
  fan: fanRouter,
  organizer: organizerRouter,
  platform: platformRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
