import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { PlusIcon, XIcon } from "lucide-react";

import type {
  DraftInventoryCell,
  DraftPerformance,
  DraftPriceCell,
  DraftRateType,
  DraftSeatCategory,
} from "./event-wizard-draft-reducer";
import {
  buildPerformanceSchedule,
  getDoorsOpenTimeValue,
  getPerformanceDateValue,
  getStartsTimeValue,
} from "./performance-schedule";

export function StepSimpleTicketing({
  performance,
  seatCategories,
  rateTypes,
  inventory,
  standardPrices,
  onUpdatePerformance,
  onAddSeatCategory,
  onUpdateSeatCategory,
  onRemoveSeatCategory,
  onInventoryChange,
  onPriceChange,
}: {
  performance?: DraftPerformance;
  seatCategories: DraftSeatCategory[];
  rateTypes: DraftRateType[];
  inventory: DraftInventoryCell[];
  standardPrices: DraftPriceCell[];
  onUpdatePerformance: (key: string, patch: Partial<DraftPerformance>) => void;
  onAddSeatCategory: () => void;
  onUpdateSeatCategory: (key: string, patch: Partial<DraftSeatCategory>) => void;
  onRemoveSeatCategory: (key: string) => void;
  onInventoryChange: (performanceKey: string, seatCategoryKey: string, capacity: number) => void;
  onPriceChange: (seatCategoryKey: string, rateTypeKey: string, price: number) => void;
}) {
  const activeSeatCategories = seatCategories.filter((seatCategory) => seatCategory.active);
  const rateType = rateTypes[0];

  if (!performance || !rateType) {
    return (
      <div className="max-w-xl rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        簡単作成の初期項目を準備中です。
      </div>
    );
  }

  const performanceDate = getPerformanceDateValue(performance);

  return (
    <div className="flex max-w-3xl flex-col gap-7">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-bold">公演</h3>
          <p className="mt-1 text-xs text-muted-foreground">簡単作成では1公演を登録します。</p>
        </div>

        <div className="rounded-md border p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`simple-performance-name-${performance.key}`}>名称</Label>
              <Input
                id={`simple-performance-name-${performance.key}`}
                aria-label="公演の名称"
                value={performance.name}
                placeholder="例：本公演"
                onChange={(event) =>
                  onUpdatePerformance(performance.key, { name: event.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`simple-performance-venue-${performance.key}`}>会場</Label>
              <Input
                id={`simple-performance-venue-${performance.key}`}
                aria-label="公演の会場"
                value={performance.venueName}
                placeholder="例：有明アリーナ"
                onChange={(event) =>
                  onUpdatePerformance(performance.key, { venueName: event.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`simple-performance-date-${performance.key}`}>月日</Label>
              <Input
                id={`simple-performance-date-${performance.key}`}
                aria-label="公演の月日"
                type="date"
                value={performanceDate}
                onChange={(event) =>
                  onUpdatePerformance(
                    performance.key,
                    buildPerformanceSchedule({
                      schedule: performance,
                      date: event.target.value,
                    }),
                  )
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`simple-performance-doors-open-${performance.key}`}>開場時刻</Label>
                <Input
                  id={`simple-performance-doors-open-${performance.key}`}
                  aria-label="公演の開場時刻"
                  type="time"
                  value={getDoorsOpenTimeValue(performance)}
                  disabled={!performanceDate}
                  onChange={(event) =>
                    onUpdatePerformance(
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
                <Label htmlFor={`simple-performance-starts-${performance.key}`}>開始時刻</Label>
                <Input
                  id={`simple-performance-starts-${performance.key}`}
                  aria-label="公演の開始時刻"
                  type="time"
                  value={getStartsTimeValue(performance)}
                  disabled={!performanceDate}
                  onChange={(event) =>
                    onUpdatePerformance(
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
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">席種・在庫・価格</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              料金種別は「{rateType.name || "一般"}」として保存します。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-dashed"
            onClick={onAddSeatCategory}
          >
            <PlusIcon />
            席種を追加
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border">
          <div className="hidden grid-cols-[1fr_112px_128px_40px] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground md:grid">
            <span>席種</span>
            <span className="text-right">在庫数</span>
            <span className="text-right">価格</span>
            <span />
          </div>
          {activeSeatCategories.map((seatCategory, index) => (
            <div
              key={seatCategory.key}
              className="grid gap-2 border-b px-3 py-3 last:border-b-0 md:grid-cols-[1fr_112px_128px_40px] md:items-center md:py-2.5"
            >
              <div className="flex flex-col gap-1 md:block">
                <span className="text-xs font-medium text-muted-foreground md:hidden">席種</span>
                <Input
                  aria-label={`席種${index + 1}の名称`}
                  value={seatCategory.name}
                  placeholder="例：一般"
                  onChange={(event) =>
                    onUpdateSeatCategory(seatCategory.key, { name: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1 md:block">
                <span className="text-xs font-medium text-muted-foreground md:hidden">在庫数</span>
                <Input
                  aria-label={`席種${index + 1}の在庫数`}
                  type="number"
                  min={0}
                  value={findInventoryValue(inventory, performance.key, seatCategory.key)}
                  className="text-right tabular-nums"
                  onChange={(event) =>
                    onInventoryChange(
                      performance.key,
                      seatCategory.key,
                      Number(event.target.value) || 0,
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1 md:block">
                <span className="text-xs font-medium text-muted-foreground md:hidden">価格</span>
                <div className="flex items-center gap-1 rounded-md border px-2 focus-within:ring-2 focus-within:ring-ring">
                  <span className="text-xs text-muted-foreground">¥</span>
                  <input
                    aria-label={`席種${index + 1}の価格`}
                    type="number"
                    min={0}
                    value={findPriceValue(standardPrices, seatCategory.key, rateType.key)}
                    className="h-8 w-full bg-transparent text-right text-sm tabular-nums outline-none"
                    onChange={(event) =>
                      onPriceChange(seatCategory.key, rateType.key, Number(event.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end md:block">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`席種${index + 1}を削除`}
                  disabled={activeSeatCategories.length <= 1}
                  title={
                    activeSeatCategories.length <= 1
                      ? "簡単作成では席種が1件以上必要です"
                      : undefined
                  }
                  onClick={() => onRemoveSeatCategory(seatCategory.key)}
                >
                  <XIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function findInventoryValue(
  inventory: DraftInventoryCell[],
  performanceKey: string,
  seatCategoryKey: string,
) {
  return (
    inventory.find(
      (cell) => cell.performanceKey === performanceKey && cell.seatCategoryKey === seatCategoryKey,
    )?.capacity ?? 0
  );
}

function findPriceValue(
  standardPrices: DraftPriceCell[],
  seatCategoryKey: string,
  rateTypeKey: string,
) {
  return (
    standardPrices.find(
      (cell) => cell.seatCategoryKey === seatCategoryKey && cell.rateTypeKey === rateTypeKey,
    )?.price ?? 0
  );
}
