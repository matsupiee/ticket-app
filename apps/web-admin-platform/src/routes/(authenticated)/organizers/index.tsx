import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/organizers/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/(authenticated)/organizers/"!</div>;
}
