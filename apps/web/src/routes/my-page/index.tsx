import { createFileRoute } from "@tanstack/react-router";

import { MyPage } from "@/features/my-page/page";

export const Route = createFileRoute("/my-page/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  return <MyPage userName={session.user.name} />;
}
