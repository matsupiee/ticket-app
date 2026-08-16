import { createFileRoute } from "@tanstack/react-router";

import { PlatformOrganizerListPage } from "@/features/organizer/list/page";

export const Route = createFileRoute("/(authenticated)/organizers/")({
  component: PlatformOrganizerListPage,
});
