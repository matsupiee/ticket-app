import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page/applications/$applicationId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/my-page/orders/$orderId/"!</div>;
}
