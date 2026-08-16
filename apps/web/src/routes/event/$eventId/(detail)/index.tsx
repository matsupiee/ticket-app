import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/event/$eventId/(detail)/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/event/$eventId/(detail)/"!</div>;
}
