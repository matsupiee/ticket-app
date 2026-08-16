import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/event/$eventId/apply/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/event/$eventId/apply/"!</div>;
}
