import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { XIcon } from "lucide-react";

import type { DraftPerformance } from "./event-wizard-draft-reducer";

export function StepPerformances({
  venueName,
  performances,
  onVenueNameChange,
  onAdd,
  onUpdate,
  onRemove,
}: {
  venueName: string;
  performances: DraftPerformance[];
  onVenueNameChange: (venueName: string) => void;
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<DraftPerformance>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="wizard-venue-name">会場</Label>
        <Input
          id="wizard-venue-name"
          value={venueName}
          placeholder="例：有明アリーナ"
          onChange={(event) => onVenueNameChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">公演（日程）</span>
          <span className="text-xs text-muted-foreground">{performances.length}公演</span>
        </div>

        <div className="flex flex-col gap-3">
          {performances.map((performance, index) => (
            <div key={performance.key} className="rounded-md border p-4">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Input
                  aria-label={`公演${index + 1}の名称`}
                  value={performance.name}
                  placeholder="公演名（例：DAY 1）"
                  onChange={(event) => onUpdate(performance.key, { name: event.target.value })}
                />
                <Input
                  aria-label={`公演${index + 1}の開場日時`}
                  type="datetime-local"
                  value={performance.doorsOpenAt}
                  onChange={(event) =>
                    onUpdate(performance.key, { doorsOpenAt: event.target.value })
                  }
                />
                <Input
                  aria-label={`公演${index + 1}の開演日時`}
                  type="datetime-local"
                  value={performance.startsAt}
                  onChange={(event) => onUpdate(performance.key, { startsAt: event.target.value })}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`公演${index + 1}を削除`}
                  disabled={Boolean(performance.id)}
                  title={
                    performance.id ? "保存済みの公演の削除は現在サポートされていません" : undefined
                  }
                  onClick={() => onRemove(performance.key)}
                >
                  <XIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" className="w-fit border-dashed" onClick={onAdd}>
          ＋ 公演を追加
        </Button>
      </div>
    </div>
  );
}
