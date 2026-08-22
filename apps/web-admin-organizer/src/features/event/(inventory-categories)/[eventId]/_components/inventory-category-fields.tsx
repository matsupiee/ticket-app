import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { XIcon } from "lucide-react";

import { InventoryMatrix } from "./inventory-matrix";
import type {
  DraftInventoryCell,
  DraftStage,
  DraftInventoryCategory,
} from "@/features/event/_utils/event-draft-reducer";

export function InventoryCategoryFields({
  inventoryCategories,
  stages,
  inventory,
  onAdd,
  onUpdate,
  onRemove,
  onInventoryChange,
}: {
  inventoryCategories: DraftInventoryCategory[];
  stages: DraftStage[];
  inventory: DraftInventoryCell[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<DraftInventoryCategory>) => void;
  onRemove: (key: string) => void;
  onInventoryChange: (stageKey: string, inventoryCategoryKey: string, capacity: number) => void;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex max-w-md flex-col gap-2.5">
        <Label>席種</Label>
        {inventoryCategories.map((inventoryCategory, index) => (
          <div key={inventoryCategory.key} className="flex items-center gap-2">
            <Input
              aria-label={`席種${index + 1}の名称`}
              value={inventoryCategory.name}
              onChange={(event) => onUpdate(inventoryCategory.key, { name: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`席種${index + 1}を削除`}
              onClick={() => onRemove(inventoryCategory.key)}
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
          stages={stages}
          inventoryCategories={inventoryCategories}
          getValue={(stageKey, inventoryCategoryKey) =>
            inventory.find(
              (cell) =>
                cell.stageKey === stageKey && cell.inventoryCategoryKey === inventoryCategoryKey,
            )?.capacity
          }
          onChange={onInventoryChange}
        />
      </div>
    </div>
  );
}
