import { protectedProcedure } from "../../../../index";
import { getPrivateDataHandler } from "./handler";

export const privateDataRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/fan/user/private-data",
    summary: "Get fan private data",
  })
  .handler(getPrivateDataHandler);
