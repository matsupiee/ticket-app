import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { XIcon } from "lucide-react";

import { PriceMatrix } from "./price-matrix";
import type {
  DraftPriceCell,
  DraftRateType,
  DraftSeatCategory,
} from "./event-wizard-draft-reducer";

export function StepRateTypes({
  rateTypes,
  seatCategories,
  standardPrices,
  onAdd,
  onUpdate,
  onRemove,
  onPriceChange,
}: {
  rateTypes: DraftRateType[];
  seatCategories: DraftSeatCategory[];
  standardPrices: DraftPriceCell[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<DraftRateType>) => void;
  onRemove: (key: string) => void;
  onPriceChange: (seatCategoryKey: string, rateTypeKey: string, price: number) => void;
}) {
  const activeSeatCategories = seatCategories.filter((seatCategory) => seatCategory.active);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="rounded-md border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        料金種別（大人・U-22 など）を定義します。ここで席種ごとの
        <strong className="text-foreground">標準価格</strong>
        を決めておくと、次の「販売受付」で券を追加したとき自動で引き継がれます（受付・公演ごとに変更可）。
      </div>

      <div className="flex max-w-md flex-col gap-2.5">
        <Label>料金種別</Label>
        {rateTypes.map((rateType, index) => {
          const removable = !rateType.id;

          return (
            <div key={rateType.key} className="flex items-center gap-2">
              <Input
                aria-label={`料金種別${index + 1}の名称`}
                value={rateType.name}
                onChange={(event) => onUpdate(rateType.key, { name: event.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`料金種別${index + 1}を削除`}
                disabled={!removable}
                title={
                  removable ? undefined : "保存済みの料金種別の削除は現在サポートされていません"
                }
                onClick={() => onRemove(rateType.key)}
              >
                <XIcon />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" className="w-fit border-dashed" onClick={onAdd}>
          ＋ 料金種別を追加
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label>標準価格（席種 × 料金種別）</Label>
        <PriceMatrix
          seatCategories={activeSeatCategories}
          rateTypes={rateTypes}
          getValue={(seatCategoryKey, rateTypeKey) =>
            standardPrices.find(
              (cell) =>
                cell.seatCategoryKey === seatCategoryKey && cell.rateTypeKey === rateTypeKey,
            )?.price
          }
          onChange={onPriceChange}
        />
      </div>
    </div>
  );
}
