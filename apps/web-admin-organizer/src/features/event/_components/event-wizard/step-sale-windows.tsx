import { useState } from "react";
import { Button } from "@ticket-app/ui/components/button";
import { Checkbox } from "@ticket-app/ui/components/checkbox";
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
import { PencilIcon, TrashIcon } from "lucide-react";

import { AddOfferDialog } from "./add-offer-dialog";
import type {
  DraftOffer,
  DraftPerformance,
  DraftPriceCell,
  DraftRateType,
  DraftSaleWindow,
  DraftSeatCategory,
} from "./event-wizard-draft-reducer";

export function StepSaleWindows({
  saleWindows,
  performances,
  seatCategories,
  rateTypes,
  standardPrices,
  onAdd,
  onUpdate,
  onRemove,
  onAddOffer,
  onUpdateOffer,
  onRemoveOffer,
}: {
  saleWindows: DraftSaleWindow[];
  performances: DraftPerformance[];
  seatCategories: DraftSeatCategory[];
  rateTypes: DraftRateType[];
  standardPrices: DraftPriceCell[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<DraftSaleWindow>) => void;
  onRemove: (key: string) => void;
  onAddOffer: (saleWindowKey: string, offer: DraftOffer) => void;
  onUpdateOffer: (saleWindowKey: string, offer: DraftOffer) => void;
  onRemoveOffer: (saleWindowKey: string, offerKey: string) => void;
}) {
  const activeSeatCategories = seatCategories.filter((seatCategory) => seatCategory.active);
  const visibleSaleWindows = saleWindows.filter((saleWindow) => !saleWindow.canceledAt);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {visibleSaleWindows.map((saleWindow, index) => (
        <SaleWindowCard
          key={saleWindow.key}
          index={index}
          saleWindow={saleWindow}
          performances={performances}
          seatCategories={activeSeatCategories}
          rateTypes={rateTypes}
          standardPrices={standardPrices}
          onUpdate={(patch) => onUpdate(saleWindow.key, patch)}
          onRemove={() => onRemove(saleWindow.key)}
          onAddOffer={(offer) => onAddOffer(saleWindow.key, offer)}
          onUpdateOffer={(offer) => onUpdateOffer(saleWindow.key, offer)}
          onRemoveOffer={(offerKey) => onRemoveOffer(saleWindow.key, offerKey)}
        />
      ))}

      <Button type="button" variant="outline" className="w-fit border-dashed" onClick={onAdd}>
        ＋ 受付を追加（一般販売など）
      </Button>
    </div>
  );
}

function SaleWindowCard({
  index,
  saleWindow,
  performances,
  seatCategories,
  rateTypes,
  standardPrices,
  onUpdate,
  onRemove,
  onAddOffer,
  onUpdateOffer,
  onRemoveOffer,
}: {
  index: number;
  saleWindow: DraftSaleWindow;
  performances: DraftPerformance[];
  seatCategories: DraftSeatCategory[];
  rateTypes: DraftRateType[];
  standardPrices: DraftPriceCell[];
  onUpdate: (patch: Partial<DraftSaleWindow>) => void;
  onRemove: () => void;
  onAddOffer: (offer: DraftOffer) => void;
  onUpdateOffer: (offer: DraftOffer) => void;
  onRemoveOffer: (offerKey: string) => void;
}) {
  const [dialogState, setDialogState] = useState<{ open: boolean; editingOffer?: DraftOffer }>({
    open: false,
  });
  const groups = groupOffersByTarget(saleWindow.offers, performances);

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-5.5 items-center rounded-md bg-foreground px-2 text-[11px] font-semibold text-background">
            受付 {index + 1}
          </span>
          <span className="text-sm font-bold">{saleWindow.name || "(名称未設定)"}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          削除
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-3.5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            受付の設定
          </div>

          <div className="grid grid-cols-[1.4fr_1fr] items-end gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`sw-name-${saleWindow.key}`}>受付名</Label>
              <Input
                id={`sw-name-${saleWindow.key}`}
                value={saleWindow.name}
                onChange={(event) => onUpdate({ name: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>販売方式</Label>
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[saleWindow.method]}
                onValueChange={(value) => {
                  const next = value[0];
                  if (next === "FIRST_COME" || next === "LOTTERY") {
                    onUpdate({ method: next });
                  }
                }}
              >
                <ToggleGroupItem value="FIRST_COME" className="flex-1 text-xs">
                  先着
                </ToggleGroupItem>
                <ToggleGroupItem value="LOTTERY" className="flex-1 text-xs">
                  抽選
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`sw-publishes-${saleWindow.key}`}>公開日時</Label>
              <Input
                id={`sw-publishes-${saleWindow.key}`}
                type="datetime-local"
                value={saleWindow.publishesAt}
                onChange={(event) => onUpdate({ publishesAt: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`sw-starts-${saleWindow.key}`}>申込開始</Label>
              <Input
                id={`sw-starts-${saleWindow.key}`}
                type="datetime-local"
                value={saleWindow.applicationStartsAt}
                onChange={(event) => onUpdate({ applicationStartsAt: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`sw-ends-${saleWindow.key}`}>申込終了</Label>
              <Input
                id={`sw-ends-${saleWindow.key}`}
                type="datetime-local"
                value={saleWindow.applicationEndsAt}
                onChange={(event) => onUpdate({ applicationEndsAt: event.target.value })}
              />
            </div>
          </div>

          {saleWindow.method === "LOTTERY" && (
            <div className="grid grid-cols-2 gap-3.5 rounded-md border border-dashed p-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`sw-lottery-mode-${saleWindow.key}`}>抽選方式</Label>
                <Select
                  value={saleWindow.lotteryMode}
                  onValueChange={(value) => {
                    if (value === "AUTO" || value === "MANUAL") {
                      onUpdate({ lotteryMode: value });
                    }
                  }}
                >
                  <SelectTrigger id={`sw-lottery-mode-${saleWindow.key}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">自動</SelectItem>
                    <SelectItem value="MANUAL">手動</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`sw-notify-${saleWindow.key}`}>当落発表日時</Label>
                <Input
                  id={`sw-notify-${saleWindow.key}`}
                  type="datetime-local"
                  value={saleWindow.notifyLotteryResultAt}
                  onChange={(event) => onUpdate({ notifyLotteryResultAt: event.target.value })}
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2.5">
            <Checkbox
              checked={saleWindow.isSmsAuthRequired}
              onCheckedChange={(checked) => onUpdate({ isSmsAuthRequired: checked === true })}
            />
            <span className="text-xs text-muted-foreground">
              申込に電話番号（SMS）認証を必須にする
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t pt-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              この受付で売る券
            </div>
            <span className="text-xs text-muted-foreground">{saleWindow.offers.length}件</span>
          </div>

          {groups.map((group) => (
            <div key={group.key} className="overflow-hidden rounded-md border">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-3.5 py-2.5">
                {group.isPass && (
                  <span className="inline-flex h-5 items-center rounded-md border px-2 text-[11px] font-semibold whitespace-nowrap text-muted-foreground">
                    通し券
                  </span>
                )}
                <span className="text-xs font-bold">{group.title}</span>
              </div>
              {group.offers.map((offer) => (
                <div
                  key={offer.key}
                  className="flex items-center justify-between gap-4 border-b px-3.5 py-3 last:border-b-0"
                >
                  <span className="text-sm font-semibold">
                    {seatCategories.find(
                      (seatCategory) => seatCategory.key === offer.seatCategoryKey,
                    )?.name ?? "(席種未設定)"}
                  </span>
                  <div className="flex items-center gap-3.5">
                    <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                      {offer.rates.map((rate) => formatRateSummary(rate, rateTypes)).join(" ・ ")}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="券を編集"
                        onClick={() => setDialogState({ open: true, editingOffer: offer })}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="券を削除"
                        disabled={Boolean(offer.id)}
                        title={
                          offer.id ? "保存済みの券の削除は現在サポートされていません" : undefined
                        }
                        onClick={() => onRemoveOffer(offer.key)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <Button
            type="button"
            className="w-fit"
            onClick={() => setDialogState({ open: true, editingOffer: undefined })}
          >
            ＋ 券を追加
          </Button>
        </div>
      </div>

      <AddOfferDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((current) => ({ ...current, open }))}
        performances={performances}
        seatCategories={seatCategories}
        rateTypes={rateTypes}
        standardPrices={standardPrices}
        editingOffer={dialogState.editingOffer}
        onSubmit={(offer) => (dialogState.editingOffer ? onUpdateOffer(offer) : onAddOffer(offer))}
      />
    </div>
  );
}

function formatRateSummary(
  rate: { rateTypeKey: string; price: number },
  rateTypes: DraftRateType[],
) {
  const rateTypeName = rateTypes.find((rateType) => rateType.key === rate.rateTypeKey)?.name ?? "";

  return `${rateTypeName} ¥${rate.price.toLocaleString("ja-JP")}`;
}

function groupOffersByTarget(offers: DraftOffer[], performances: DraftPerformance[]) {
  const groups = new Map<string, DraftOffer[]>();

  for (const offer of offers) {
    const key = [...offer.performanceKeys].sort().join(",");
    const existing = groups.get(key);
    if (existing) {
      existing.push(offer);
    } else {
      groups.set(key, [offer]);
    }
  }

  return Array.from(groups.entries()).map(([key, groupOffers]) => {
    const names = groupOffers[0]?.performanceKeys
      .map(
        (performanceKey) =>
          performances.find((performance) => performance.key === performanceKey)?.name,
      )
      .filter((name): name is string => Boolean(name));
    const isPass = (groupOffers[0]?.performanceKeys.length ?? 0) > 1;

    return {
      key,
      isPass,
      title: isPass ? `通し券（${(names ?? []).join("・")}）` : (names?.[0] ?? "(公演未設定)"),
      offers: groupOffers,
    };
  });
}
