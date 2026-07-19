import { z } from "zod";

import { listEventsHandler } from "./handler";
import { publicProcedure } from "../../../../index";

const listEventsInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  query: z.string().trim().min(1).optional(),
});

const listEventsOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
      eventOrganizerName: z.string().min(1),
      location: z.string().min(1),
      imageUrl: z.string().min(1),
      tags: z.array(z.string().min(1)),
      firstPerformanceStartsAt: z.string().min(1).optional(),
      saleMethods: z.array(z.enum(["FIRST_COME", "LOTTERY"])),
      minPrice: z.number().int().min(0).optional(),
    }),
  ),
  nextCursor: z.string().min(1).optional(),
});

export const listEventsRoute = publicProcedure
  .route({
    method: "GET",
    path: "/fan/events",
    summary: "List fan-visible events",
  })
  .input(listEventsInputSchema)
  .output(listEventsOutputSchema)
  .handler(listEventsHandler);
