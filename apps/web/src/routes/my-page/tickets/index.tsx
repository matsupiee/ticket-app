import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page/tickets/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/my-page/tickets/"!</div>;
}
