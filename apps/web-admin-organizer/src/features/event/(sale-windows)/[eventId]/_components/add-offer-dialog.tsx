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
  DraftStage,
  DraftRateType,
  DraftInventoryCategory,
} from "@/features/event/_utils/event-draft-reducer";

export function AddOfferDialog({
  open,
  onOpenChange,
  stages,
  inventoryCategories,
  rateTypes,
  editingOffer,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: DraftStage[];
  inventoryCategories: DraftInventoryCategory[];
  rateTypes: DraftRateType[];
  editingOffer?: DraftOffer;
  onSubmit: (offer: DraftOffer) => void;
}) {
  const [isPass, setIsPass] = useState(false);
  const [stageKeys, setStageKeys] = useState<string[]>([]);
  const [inventoryCategoryKey, setInventoryCategoryKey] = useState("");
  const [maxQuantityPerOrder, setMaxQuantityPerOrder] = useState(4);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const stageLabels = Object.fromEntries(
    stages.map((stage) => [stage.key, stage.name || "(未設定)"]),
  );
  const inventoryCategoryLabels = Object.fromEntries(
    inventoryCategories.map((inventoryCategory) => [
      inventoryCategory.key,
      inventoryCategory.name || "(未設定)",
    ]),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingOffer) {
      setIsPass(editingOffer.isPass);
      setStageKeys(editingOffer.stageKeys);
      setInventoryCategoryKey(editingOffer.inventoryCategoryKey);
      setMaxQuantityPerOrder(editingOffer.maxQuantityPerOrder);
      setPrices(
        Object.fromEntries(editingOffer.rates.map((rate) => [rate.rateTypeKey, rate.price])),
      );
      return;
    }

    const defaultInventoryCategoryKey = inventoryCategories[0]?.key ?? "";
    setIsPass(false);
    setStageKeys(stages[0] ? [stages[0].key] : []);
    setInventoryCategoryKey(defaultInventoryCategoryKey);
    setMaxQuantityPerOrder(4);
    setPrices(buildEmptyPrices(rateTypes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingOffer]);

  function handleInventoryCategoryChange(nextInventoryCategoryKey: string | null) {
    if (!nextInventoryCategoryKey) {
      return;
    }
    setInventoryCategoryKey(nextInventoryCategoryKey);
  }

  function toggleStage(stageKey: string) {
    setStageKeys((current) =>
      current.includes(stageKey)
        ? current.filter((key) => key !== stageKey)
        : [...current, stageKey],
    );
  }

  function handleSubmit() {
    if (stageKeys.length === 0 || !inventoryCategoryKey) {
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
      stageKeys,
      inventoryCategoryKey,
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
                {stages.map((stage) => {
                  const selected = stageKeys.includes(stage.key);

                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => toggleStage(stage.key)}
                      className={
                        selected
                          ? "inline-flex h-7.5 items-center gap-1.5 rounded-md bg-foreground px-2.5 text-xs font-medium text-background"
                          : "inline-flex h-7.5 items-center gap-1.5 rounded-md border px-2.5 text-xs text-muted-foreground"
                      }
                    >
                      {selected && <CheckIcon className="size-3" strokeWidth={3} />}
                      {stage.name || "(未設定)"}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="offer-stage">対象公演</Label>
              <Select
                value={stageKeys[0] ?? ""}
                onValueChange={(value) => setStageKeys(value ? [value] : [])}
              >
                <SelectTrigger id="offer-stage" className="w-full">
                  <SelectValue placeholder="公演を選択">
                    {(value) =>
                      formatSelectedLabel(value, stageLabels, "公演を選択", "(公演未設定)")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.key} value={stage.key}>
                      {stage.name || "(未設定)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="offer-inventory-category">席種</Label>
            <Select value={inventoryCategoryKey} onValueChange={handleInventoryCategoryChange}>
              <SelectTrigger id="offer-inventory-category" className="w-full">
                <SelectValue placeholder="席種を選択">
                  {(value) =>
                    formatSelectedLabel(
                      value,
                      inventoryCategoryLabels,
                      "席種を選択",
                      "(席種未設定)",
                    )
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {inventoryCategories.map((inventoryCategory) => (
                  <SelectItem key={inventoryCategory.key} value={inventoryCategory.key}>
                    {inventoryCategory.name || "(未設定)"}
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
            <Label>価格（料金種別ごと）</Label>
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
                      aria-label={`${rateType.name || "料金種別"}の価格`}
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
            disabled={stageKeys.length === 0 || !inventoryCategoryKey}
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

function buildEmptyPrices(rateTypes: DraftRateType[]) {
  return Object.fromEntries(rateTypes.map((rateType) => [rateType.key, 0]));
}
