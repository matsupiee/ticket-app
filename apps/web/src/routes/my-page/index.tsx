import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/my-page/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/my-page/"!</div>;
}
