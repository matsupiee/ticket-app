import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/")({
  beforeLoad: () => {
    throw redirect({ to: "/organizers" });
  },
});
