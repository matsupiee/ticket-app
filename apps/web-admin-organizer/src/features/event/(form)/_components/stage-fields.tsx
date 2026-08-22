import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { PlusIcon, XIcon } from "lucide-react";

import type { DraftStage } from "@/features/event/_utils/event-draft-reducer";
import {
  buildStageSchedule,
  getDoorsOpenTimeValue,
  getStageDateValue,
  getStartsTimeValue,
} from "@/features/event/_utils/stage-schedule";

export function StageFields({
  stages,
  onAdd,
  onUpdate,
  onRemove,
}: {
  stages: DraftStage[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<DraftStage>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">公演（日程）</span>
          <span className="text-xs text-muted-foreground">{stages.length}公演</span>
        </div>

        <div className="flex flex-col gap-3">
          {stages.map((stage, index) => {
            const stageDate = getStageDateValue(stage);

            return (
              <div key={stage.key} className="rounded-md border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    公演 {String(index + 1).padStart(2, "0")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`公演${index + 1}を削除`}
                    disabled={Boolean(stage.id)}
                    title={
                      stage.id ? "保存済みの公演の削除は現在サポートされていません" : undefined
                    }
                    onClick={() => onRemove(stage.key)}
                  >
                    <XIcon />
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`stage-name-${stage.key}`}>名称</Label>
                    <Input
                      id={`stage-name-${stage.key}`}
                      aria-label={`公演${index + 1}の名称`}
                      value={stage.name}
                      placeholder="例：DAY 1"
                      onChange={(event) => onUpdate(stage.key, { name: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`stage-venue-${stage.key}`}>会場</Label>
                    <Input
                      id={`stage-venue-${stage.key}`}
                      aria-label={`公演${index + 1}の会場`}
                      value={stage.venueName}
                      placeholder="例：有明アリーナ"
                      onChange={(event) => onUpdate(stage.key, { venueName: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`stage-date-${stage.key}`}>月日</Label>
                    <Input
                      id={`stage-date-${stage.key}`}
                      aria-label={`公演${index + 1}の月日`}
                      type="date"
                      value={stageDate}
                      onChange={(event) =>
                        onUpdate(
                          stage.key,
                          buildStageSchedule({
                            schedule: stage,
                            date: event.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`stage-doors-open-${stage.key}`}>開場時刻</Label>
                    <Input
                      id={`stage-doors-open-${stage.key}`}
                      aria-label={`公演${index + 1}の開場時刻`}
                      type="time"
                      value={getDoorsOpenTimeValue(stage)}
                      disabled={!stageDate}
                      onChange={(event) =>
                        onUpdate(
                          stage.key,
                          buildStageSchedule({
                            schedule: stage,
                            doorsOpenTime: event.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`stage-starts-${stage.key}`}>開始時刻</Label>
                    <Input
                      id={`stage-starts-${stage.key}`}
                      aria-label={`公演${index + 1}の開始時刻`}
                      type="time"
                      value={getStartsTimeValue(stage)}
                      disabled={!stageDate}
                      onChange={(event) =>
                        onUpdate(
                          stage.key,
                          buildStageSchedule({
                            schedule: stage,
                            startsTime: event.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button type="button" variant="outline" className="w-fit border-dashed" onClick={onAdd}>
          <PlusIcon />
          公演を追加
        </Button>
      </div>
    </div>
  );
}
