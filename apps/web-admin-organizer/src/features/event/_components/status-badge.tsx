import {
  type EventStatus,
  type SettlementStatus,
  eventStatusLabels,
  settlementStatusLabels,
} from "../_utils/operations";

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className="inline-flex items-center border px-2 py-1 text-xs text-muted-foreground">
      {eventStatusLabels[status]}
    </span>
  );
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return (
    <span className="inline-flex items-center border px-2 py-1 text-xs text-muted-foreground">
      {settlementStatusLabels[status]}
    </span>
  );
}
