import { Label } from "@ticket-app/ui/components/label";
import { Input } from "@ticket-app/ui/components/input";
import { Textarea } from "@ticket-app/ui/components/textarea";

import type { WizardDraft } from "./event-wizard-draft-reducer";

export function StepBasicInfo({
  draft,
  onChange,
}: {
  draft: WizardDraft;
  onChange: (patch: { name?: string; description?: string }) => void;
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
    </div>
  );
}
