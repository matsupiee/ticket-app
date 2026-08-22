import {
  type EventPublishPeriod,
  eventPublishStateLabels,
  getEventPublishState,
} from "../_utils/operations";

// イベントの状態は公開期間から導出する（ADR 0012）
export function EventStatusBadge({ event }: { event: EventPublishPeriod }) {
  return (
    <span className="inline-flex items-center border px-2 py-1 text-xs text-muted-foreground">
      {eventPublishStateLabels[getEventPublishState(event)]}
    </span>
  );
}
