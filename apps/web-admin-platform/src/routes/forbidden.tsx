import { createFileRoute } from "@tanstack/react-router";

import { ForbiddenPage } from "@/shared/_components/forbidden-page";

export const Route = createFileRoute("/forbidden")({
  component: ForbiddenPage,
});
