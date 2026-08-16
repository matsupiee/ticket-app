import { ORPCError } from "@orpc/server";

// ADR 0007 のAPI書き直しが未着手のルート。書き直すまでは未実装であることを明示する。
export function upsertRateTypeHandler(_options?: unknown): never {
  throw new ORPCError("NOT_IMPLEMENTED");
}
