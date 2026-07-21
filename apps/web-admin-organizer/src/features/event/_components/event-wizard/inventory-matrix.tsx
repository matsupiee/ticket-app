import { useEffect, useState } from "react";

type DragRange = {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
};

export function InventoryMatrix({
  performances,
  seatCategories,
  getValue,
  onChange,
}: {
  performances: { key: string; name: string }[];
  seatCategories: { key: string; name: string }[];
  getValue: (performanceKey: string, seatCategoryKey: string) => number | undefined;
  onChange: (performanceKey: string, seatCategoryKey: string, value: number) => void;
}) {
  const [drag, setDrag] = useState<DragRange | null>(null);

  useEffect(() => {
    if (!drag) {
      return;
    }

    function handlePointerUp() {
      setDrag((current) => {
        if (!current) {
          return null;
        }

        const minRow = Math.min(current.fromRow, current.toRow);
        const maxRow = Math.max(current.fromRow, current.toRow);
        const minCol = Math.min(current.fromCol, current.toCol);
        const maxCol = Math.max(current.fromCol, current.toCol);
        const sourcePerformance = performances[current.fromRow];
        const sourceSeatCategory = seatCategories[current.fromCol];
        const sourceValue =
          sourcePerformance && sourceSeatCategory
            ? getValue(sourcePerformance.key, sourceSeatCategory.key)
            : undefined;

        if (sourceValue !== undefined) {
          for (let row = minRow; row <= maxRow; row += 1) {
            for (let col = minCol; col <= maxCol; col += 1) {
              const performance = performances[row];
              const seatCategory = seatCategories[col];
              if (performance && seatCategory) {
                onChange(performance.key, seatCategory.key, sourceValue);
              }
            }
          }
        }

        return null;
      });
    }

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(drag)]);

  if (performances.length === 0 || seatCategories.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        公演と席種をそれぞれ1件以上登録すると、在庫の表が表示されます。
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="border-r border-b px-3.5 py-2 text-left text-xs font-semibold text-muted-foreground">
              公演＼席種
            </th>
            {seatCategories.map((seatCategory) => (
              <th
                key={seatCategory.key}
                className="border-b border-l px-3 py-2 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground"
              >
                {seatCategory.name || "(未設定)"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {performances.map((performance, rowIndex) => (
            <tr key={performance.key} className="border-b last:border-b-0">
              <td className="border-r bg-muted px-3.5 py-2 text-xs font-semibold whitespace-nowrap">
                {performance.name || "(未設定)"}
              </td>
              {seatCategories.map((seatCategory, colIndex) => {
                const value = getValue(performance.key, seatCategory.key);
                const inRange =
                  drag &&
                  rowIndex >= Math.min(drag.fromRow, drag.toRow) &&
                  rowIndex <= Math.max(drag.fromRow, drag.toRow) &&
                  colIndex >= Math.min(drag.fromCol, drag.toCol) &&
                  colIndex <= Math.max(drag.fromCol, drag.toCol);

                return (
                  <td
                    key={seatCategory.key}
                    className={`group relative border-l p-0 ${inRange ? "bg-foreground/5 ring-1 ring-inset ring-foreground" : ""}`}
                    onPointerEnter={() => {
                      setDrag((current) =>
                        current ? { ...current, toRow: rowIndex, toCol: colIndex } : null,
                      );
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label={`${performance.name || "公演"} × ${seatCategory.name || "席種"}の在庫数`}
                      value={value ?? ""}
                      placeholder="—"
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        onChange(
                          performance.key,
                          seatCategory.key,
                          Number.isNaN(nextValue) ? 0 : nextValue,
                        );
                      }}
                      className="h-9.5 w-full bg-transparent px-3 text-right text-sm tabular-nums outline-none transition-shadow focus:bg-background focus:ring-2 focus:ring-inset focus:ring-ring"
                    />
                    <span
                      role="presentation"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setDrag({
                          fromRow: rowIndex,
                          fromCol: colIndex,
                          toRow: rowIndex,
                          toCol: colIndex,
                        });
                      }}
                      className="absolute right-0 bottom-0 size-2.5 cursor-crosshair touch-none border border-background bg-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
