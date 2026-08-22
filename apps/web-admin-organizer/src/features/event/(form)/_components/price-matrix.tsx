export function PriceMatrix({
  seatCategories,
  rateTypes,
  getValue,
  onChange,
}: {
  seatCategories: { key: string; name: string }[];
  rateTypes: { key: string; name: string }[];
  getValue: (seatCategoryKey: string, rateTypeKey: string) => number | undefined;
  onChange: (seatCategoryKey: string, rateTypeKey: string, value: number) => void;
}) {
  if (seatCategories.length === 0 || rateTypes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        席種と料金種別をそれぞれ1件以上登録すると、標準価格の表が表示されます。
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="border-b px-3.5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
              席種＼料金種別
            </th>
            {rateTypes.map((rateType) => (
              <th
                key={rateType.key}
                className="border-b border-l px-3.5 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-muted-foreground"
              >
                {rateType.name || "(未設定)"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seatCategories.map((seatCategory) => (
            <tr key={seatCategory.key} className="border-b last:border-b-0">
              <td className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
                {seatCategory.name || "(未設定)"}
              </td>
              {rateTypes.map((rateType) => {
                const value = getValue(seatCategory.key, rateType.key);

                return (
                  <td key={rateType.key} className="border-l p-1.5">
                    <div className="flex items-center gap-1 rounded-md border px-2.5 focus-within:ring-2 focus-within:ring-ring">
                      <span className="text-xs text-muted-foreground">¥</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        aria-label={`${seatCategory.name || "席種"} × ${rateType.name || "料金種別"}の標準価格`}
                        value={value ?? ""}
                        placeholder="12000"
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          onChange(
                            seatCategory.key,
                            rateType.key,
                            Number.isNaN(nextValue) ? 0 : nextValue,
                          );
                        }}
                        className="h-8.5 w-full bg-transparent text-right text-sm tabular-nums outline-none"
                      />
                    </div>
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
