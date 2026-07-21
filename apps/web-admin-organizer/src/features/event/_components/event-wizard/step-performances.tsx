import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { PlusIcon, XIcon } from "lucide-react";

import type { DraftPerformance } from "./event-wizard-draft-reducer";
import {
  buildPerformanceSchedule,
  getDoorsOpenTimeValue,
  getPerformanceDateValue,
  getStartsTimeValue,
} from "./performance-schedule";

export function StepPerformances({
  performances,
  onAdd,
  onUpdate,
  onRemove,
}: {
  performances: DraftPerformance[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<DraftPerformance>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">公演（日程）</span>
          <span className="text-xs text-muted-foreground">{performances.length}公演</span>
        </div>

        <div className="flex flex-col gap-3">
          {performances.map((performance, index) => {
            const performanceDate = getPerformanceDateValue(performance);

            return (
              <div key={performance.key} className="rounded-md border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    公演 {String(index + 1).padStart(2, "0")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`公演${index + 1}を削除`}
                    disabled={Boolean(performance.id)}
                    title={
                      performance.id
                        ? "保存済みの公演の削除は現在サポートされていません"
                        : undefined
                    }
                    onClick={() => onRemove(performance.key)}
                  >
                    <XIcon />
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`performance-name-${performance.key}`}>名称</Label>
                    <Input
                      id={`performance-name-${performance.key}`}
                      aria-label={`公演${index + 1}の名称`}
                      value={performance.name}
                      placeholder="例：DAY 1"
                      onChange={(event) => onUpdate(performance.key, { name: event.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`performance-venue-${performance.key}`}>会場</Label>
                    <Input
                      id={`performance-venue-${performance.key}`}
                      aria-label={`公演${index + 1}の会場`}
                      value={performance.venueName}
                      placeholder="例：有明アリーナ"
                      onChange={(event) =>
                        onUpdate(performance.key, { venueName: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`performance-date-${performance.key}`}>月日</Label>
                    <Input
                      id={`performance-date-${performance.key}`}
                      aria-label={`公演${index + 1}の月日`}
                      type="date"
                      value={performanceDate}
                      onChange={(event) =>
                        onUpdate(
                          performance.key,
                          buildPerformanceSchedule({
                            schedule: performance,
                            date: event.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`performance-doors-open-${performance.key}`}>開場時刻</Label>
                    <Input
                      id={`performance-doors-open-${performance.key}`}
                      aria-label={`公演${index + 1}の開場時刻`}
                      type="time"
                      value={getDoorsOpenTimeValue(performance)}
                      disabled={!performanceDate}
                      onChange={(event) =>
                        onUpdate(
                          performance.key,
                          buildPerformanceSchedule({
                            schedule: performance,
                            doorsOpenTime: event.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`performance-starts-${performance.key}`}>開始時刻</Label>
                    <Input
                      id={`performance-starts-${performance.key}`}
                      aria-label={`公演${index + 1}の開始時刻`}
                      type="time"
                      value={getStartsTimeValue(performance)}
                      disabled={!performanceDate}
                      onChange={(event) =>
                        onUpdate(
                          performance.key,
                          buildPerformanceSchedule({
                            schedule: performance,
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
