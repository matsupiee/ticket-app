import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page/applications/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/my-page/orders/"!</div>;
}
