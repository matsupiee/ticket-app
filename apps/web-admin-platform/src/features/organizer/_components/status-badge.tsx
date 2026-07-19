import { type OrganizerStatus, organizerStatusLabels } from "../_utils/platform";

export function OrganizerStatusBadge({ status }: { status: OrganizerStatus }) {
  return (
    <span className="inline-flex items-center border px-2 py-1 text-xs text-muted-foreground">
      {organizerStatusLabels[status]}
    </span>
  );
}
