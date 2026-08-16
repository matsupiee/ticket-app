import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/my-page/profile/"!</div>;
}
