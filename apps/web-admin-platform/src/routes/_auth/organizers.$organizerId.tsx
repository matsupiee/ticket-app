import { createFileRoute, notFound } from "@tanstack/react-router";

import { PlatformOrganizerDetailPage } from "@/features/organizer/detail-page";
import { getPlatformOrganizerById } from "@/features/organizer/_utils/platform";

export const Route = createFileRoute("/_auth/organizers/$organizerId")({
  component: RouteComponent,
  loader: ({ params }) => {
    const organizer = getPlatformOrganizerById(params.organizerId);

    if (!organizer) {
      throw notFound();
    }

    return { organizer };
  },
});

function RouteComponent() {
  const { organizer } = Route.useLoaderData();

  return <PlatformOrganizerDetailPage organizer={organizer} />;
}
