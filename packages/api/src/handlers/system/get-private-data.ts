import type { Context } from "../../context";

export function getPrivateDataHandler({ context }: { context: Context }) {
  return {
    message: "This is private",
    user: context.session?.user,
  };
}
