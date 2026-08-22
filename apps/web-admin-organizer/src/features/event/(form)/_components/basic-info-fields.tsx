import { Label } from "@ticket-app/ui/components/label";
import { Input } from "@ticket-app/ui/components/input";
import { Textarea } from "@ticket-app/ui/components/textarea";

import type { EventDraft } from "@/features/event/_utils/event-draft-reducer";

export function BasicInfoFields({
  draft,
  onChange,
}: {
  draft: EventDraft;
  onChange: (patch: {
    name?: string;
    description?: string;
    publishesAt?: string;
    closesAt?: string;
  }) => void;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wizard-event-name">イベント名</Label>
        <Input
          id="wizard-event-name"
          value={draft.name}
          placeholder="例：TOKYO ORBIT 2026"
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wizard-event-description">説明</Label>
        <Textarea
          id="wizard-event-description"
          value={draft.description}
          placeholder="イベントの概要や注意事項を入力"
          className="min-h-24"
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-publishes-at">公開日時</Label>
          <Input
            id="event-publishes-at"
            type="datetime-local"
            value={draft.publishesAt}
            onChange={(event) => onChange({ publishesAt: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            未入力の間は下書きで、購入者には表示されません。
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-closes-at">公開終了日時</Label>
          <Input
            id="event-closes-at"
            type="datetime-local"
            value={draft.closesAt}
            onChange={(event) => onChange({ closesAt: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            未入力なら終了日を決めずに公開し続けます。
          </p>
        </div>
      </div>
    </div>
  );
}
