import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(guest)/sign-up")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/(guest)/sign-up"!</div>;
}
