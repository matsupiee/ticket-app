import { useEffect, useState } from "react";
import { Button } from "@ticket-app/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ticket-app/ui/components/dialog";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ticket-app/ui/components/select";
import { ToggleGroup, ToggleGroupItem } from "@ticket-app/ui/components/toggle-group";
import { CheckIcon } from "lucide-react";

import type {
  DraftOffer,
  DraftOfferRate,
  DraftPerformance,
  DraftPriceCell,
  DraftRateType,
  DraftSeatCategory,
} from "./event-wizard-draft-reducer";

export function AddOfferDialog({
  open,
  onOpenChange,
  performances,
  seatCategories,
  rateTypes,
  standardPrices,
  editingOffer,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performances: DraftPerformance[];
  seatCategories: DraftSeatCategory[];
  rateTypes: DraftRateType[];
  standardPrices: DraftPriceCell[];
  editingOffer?: DraftOffer;
  onSubmit: (offer: DraftOffer) => void;
}) {
  const [isPass, setIsPass] = useState(false);
  const [performanceKeys, setPerformanceKeys] = useState<string[]>([]);
  const [seatCategoryKey, setSeatCategoryKey] = useState("");
  const [maxQuantityPerOrder, setMaxQuantityPerOrder] = useState(4);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const performanceLabels = Object.fromEntries(
    performances.map((performance) => [performance.key, performance.name || "(未設定)"]),
  );
  const seatCategoryLabels = Object.fromEntries(
    seatCategories.map((seatCategory) => [seatCategory.key, seatCategory.name || "(未設定)"]),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingOffer) {
      setIsPass(editingOffer.isPass);
      setPerformanceKeys(editingOffer.performanceKeys);
      setSeatCategoryKey(editingOffer.seatCategoryKey);
      setMaxQuantityPerOrder(editingOffer.maxQuantityPerOrder);
      setPrices(
        Object.fromEntries(editingOffer.rates.map((rate) => [rate.rateTypeKey, rate.price])),
      );
      return;
    }

    const defaultSeatCategoryKey = seatCategories[0]?.key ?? "";
    setIsPass(false);
    setPerformanceKeys(performances[0] ? [performances[0].key] : []);
    setSeatCategoryKey(defaultSeatCategoryKey);
    setMaxQuantityPerOrder(4);
    setPrices(buildPricesFromStandard(defaultSeatCategoryKey, rateTypes, standardPrices));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingOffer]);

  function handleSeatCategoryChange(nextSeatCategoryKey: string | null) {
    if (!nextSeatCategoryKey) {
      return;
    }
    setSeatCategoryKey(nextSeatCategoryKey);
    setPrices(buildPricesFromStandard(nextSeatCategoryKey, rateTypes, standardPrices));
  }

  function togglePerformance(performanceKey: string) {
    setPerformanceKeys((current) =>
      current.includes(performanceKey)
        ? current.filter((key) => key !== performanceKey)
        : [...current, performanceKey],
    );
  }

  function handleSubmit() {
    if (performanceKeys.length === 0 || !seatCategoryKey) {
      return;
    }

    const rates: DraftOfferRate[] = rateTypes.map((rateType) => ({
      rateTypeKey: rateType.key,
      price: prices[rateType.key] ?? 0,
    }));

    onSubmit({
      key: editingOffer?.key ?? crypto.randomUUID(),
      id: editingOffer?.id,
      isPass,
      performanceKeys,
      seatCategoryKey,
      maxQuantityPerOrder,
      rates,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingOffer ? "券を編集" : "券を追加"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4.5">
          <div className="flex flex-col gap-2">
            <Label>種別</Label>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[isPass ? "pass" : "single"]}
              onValueChange={(value) => {
                const next = value[0];
                if (next) {
                  setIsPass(next === "pass");
                }
              }}
              className="w-fit"
            >
              <ToggleGroupItem value="single" className="px-4 text-xs">
                単券（1公演）
              </ToggleGroupItem>
              <ToggleGroupItem value="pass" className="px-4 text-xs">
                通し券（複数公演）
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isPass ? (
            <div className="flex flex-col gap-2">
              <Label>対象公演（複数選択）</Label>
              <div className="flex flex-wrap gap-2">
                {performances.map((performance) => {
                  const selected = performanceKeys.includes(performance.key);

                  return (
                    <button
                      key={performance.key}
                      type="button"
                      onClick={() => togglePerformance(performance.key)}
                      className={
                        selected
                          ? "inline-flex h-7.5 items-center gap-1.5 rounded-md bg-foreground px-2.5 text-xs font-medium text-background"
                          : "inline-flex h-7.5 items-center gap-1.5 rounded-md border px-2.5 text-xs text-muted-foreground"
                      }
                    >
                      {selected && <CheckIcon className="size-3" strokeWidth={3} />}
                      {performance.name || "(未設定)"}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-performance">対象公演</Label>
              <Select
                value={performanceKeys[0] ?? ""}
                onValueChange={(value) => setPerformanceKeys(value ? [value] : [])}
              >
                <SelectTrigger id="offer-performance" className="w-full">
                  <SelectValue placeholder="公演を選択">
                    {(value) =>
                      formatSelectedLabel(value, performanceLabels, "公演を選択", "(公演未設定)")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {performances.map((performance) => (
                    <SelectItem key={performance.key} value={performance.key}>
                      {performance.name || "(未設定)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="offer-seat-category">席種</Label>
            <Select value={seatCategoryKey} onValueChange={handleSeatCategoryChange}>
              <SelectTrigger id="offer-seat-category" className="w-full">
                <SelectValue placeholder="席種を選択">
                  {(value) =>
                    formatSelectedLabel(value, seatCategoryLabels, "席種を選択", "(席種未設定)")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {seatCategories.map((seatCategory) => (
                  <SelectItem key={seatCategory.key} value={seatCategory.key}>
                    {seatCategory.name || "(未設定)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="offer-max-quantity">1注文あたり上限枚数</Label>
            <Input
              id="offer-max-quantity"
              type="number"
              min={1}
              value={maxQuantityPerOrder}
              onChange={(event) => setMaxQuantityPerOrder(Number(event.target.value) || 1)}
              className="w-24"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              価格（料金種別ごと）
              <span className="font-normal text-muted-foreground">・標準価格から自動入力</span>
            </Label>
            <div className="flex flex-col gap-2">
              {rateTypes.map((rateType) => (
                <div key={rateType.key} className="flex items-center gap-2.5">
                  <span className="w-20 text-xs text-muted-foreground">
                    {rateType.name || "(未設定)"}
                  </span>
                  <div className="flex flex-1 items-center gap-1 rounded-md border px-2.5 focus-within:ring-2 focus-within:ring-ring">
                    <span className="text-xs text-muted-foreground">¥</span>
                    <input
                      type="number"
                      min={0}
                      value={prices[rateType.key] ?? 0}
                      onChange={(event) =>
                        setPrices((current) => ({
                          ...current,
                          [rateType.key]: Number(event.target.value) || 0,
                        }))
                      }
                      className="h-9 w-full bg-transparent text-right text-sm tabular-nums outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            disabled={performanceKeys.length === 0 || !seatCategoryKey}
            onClick={handleSubmit}
          >
            {editingOffer ? "更新する" : "追加する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatSelectedLabel(
  value: unknown,
  labels: Record<string, string>,
  placeholder: string,
  missingLabel: string,
) {
  if (typeof value !== "string" || value.length === 0) {
    return placeholder;
  }

  return labels[value] ?? missingLabel;
}

function buildPricesFromStandard(
  seatCategoryKey: string,
  rateTypes: DraftRateType[],
  standardPrices: DraftPriceCell[],
) {
  return Object.fromEntries(
    rateTypes.map((rateType) => [
      rateType.key,
      standardPrices.find(
        (cell) => cell.seatCategoryKey === seatCategoryKey && cell.rateTypeKey === rateType.key,
      )?.price ?? 0,
    ]),
  );
}
