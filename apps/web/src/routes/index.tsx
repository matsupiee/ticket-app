import { createFileRoute } from "@tanstack/react-router";

import { EventListPage } from "@/features/event/list/page";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <EventListPage />;
}
