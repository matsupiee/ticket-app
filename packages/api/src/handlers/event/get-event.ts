import { ORPCError } from "@orpc/server";

export function getEventHandler(): never {
  throw new ORPCError("NOT_IMPLEMENTED");
}
