import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { XIcon } from "lucide-react";

import { InventoryMatrix } from "./inventory-matrix";
import type {
  DraftInventoryCell,
  DraftPerformance,
  DraftSeatCategory,
} from "./event-wizard-draft-reducer";

export function StepSeatCategories({
  seatCategories,
  performances,
  inventory,
  onAdd,
  onUpdate,
  onRemove,
  onInventoryChange,
}: {
  seatCategories: DraftSeatCategory[];
  performances: DraftPerformance[];
  inventory: DraftInventoryCell[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<DraftSeatCategory>) => void;
  onRemove: (key: string) => void;
  onInventoryChange: (performanceKey: string, seatCategoryKey: string, capacity: number) => void;
}) {
  const activeSeatCategories = seatCategories.filter((seatCategory) => seatCategory.active);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex max-w-md flex-col gap-2.5">
        <Label>席種</Label>
        {activeSeatCategories.map((seatCategory, index) => (
          <div key={seatCategory.key} className="flex items-center gap-2">
            <Input
              aria-label={`席種${index + 1}の名称`}
              value={seatCategory.name}
              onChange={(event) => onUpdate(seatCategory.key, { name: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`席種${index + 1}を削除`}
              onClick={() => onRemove(seatCategory.key)}
            >
              <XIcon />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" className="w-fit border-dashed" onClick={onAdd}>
          ＋ 席種を追加
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <Label>在庫数（公演 × 席種）</Label>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            セル右下の■をドラッグで一括コピー
          </span>
        </div>
        <InventoryMatrix
          performances={performances}
          seatCategories={activeSeatCategories}
          getValue={(performanceKey, seatCategoryKey) =>
            inventory.find(
              (cell) =>
                cell.performanceKey === performanceKey && cell.seatCategoryKey === seatCategoryKey,
            )?.capacity
          }
          onChange={onInventoryChange}
        />
      </div>
    </div>
  );
}
