import { Button } from "@ticket-app/ui/components/button";
import { Label } from "@ticket-app/ui/components/label";
import { cn } from "@ticket-app/ui/lib/utils";
import { WalletCards } from "lucide-react";
import { useState } from "react";

import { admissionMethodLabels, saleMethodLabels } from "../../../_utils/labels";
import {
  type ApplicationSelection,
  type TicketEvent,
  calculateTicketQuote,
  formatCurrency,
  formatDateTime,
} from "../../../_utils/ticketing";

type CompletionHandler = (selection: ApplicationSelection) => void;

export function TicketApplicationPanel({
  event,
  initialSelection,
  onComplete,
}: {
  event: TicketEvent;
  initialSelection: ApplicationSelection;
  onComplete: CompletionHandler;
}) {
  const [selection, setSelection] = useState(initialSelection);
  const quote = calculateTicketQuote(selection);
  const selectedSaleWindow = event.saleWindows.find(
    (saleWindow) => saleWindow.id === selection.saleWindowId,
  );
  const selectedOffer = selectedSaleWindow?.offers.find((offer) => offer.id === selection.offerId);
  const selectablePerformances = event.performances.filter((performance) =>
    selectedOffer?.performanceIds.includes(performance.id),
  );

  function updateSelection(nextSelection: Partial<ApplicationSelection>) {
    setSelection((currentSelection) => {
      const mergedSelection = { ...currentSelection, ...nextSelection };
      const saleWindow = event.saleWindows.find(
        (window) => window.id === mergedSelection.saleWindowId,
      );
      const offer = saleWindow?.offers.find(
        (saleOffer) => saleOffer.id === mergedSelection.offerId,
      );
      const firstOfferRate = offer?.rates[0];

      if (offer && !offer.performanceIds.includes(mergedSelection.performanceId)) {
        mergedSelection.performanceId = offer.performanceIds[0] ?? mergedSelection.performanceId;
      }

      if (offer && !offer.rates.some((rate) => rate.rateTypeId === mergedSelection.rateTypeId)) {
        mergedSelection.rateTypeId = firstOfferRate?.rateTypeId ?? mergedSelection.rateTypeId;
      }

      if (offer && mergedSelection.quantity > offer.maxQuantityPerOrder) {
        mergedSelection.quantity = offer.maxQuantityPerOrder;
      }

      return mergedSelection;
    });
  }

  return (
    <form
      className="space-y-6 border-y py-6"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        onComplete(selection);
      }}
    >
      <div className="grid gap-4">
        <SelectField
          id="saleWindowId"
          label="販売受付"
          value={selection.saleWindowId}
          onChange={(value) => {
            const saleWindow = event.saleWindows.find((window) => window.id === value);
            const offer = saleWindow?.offers[0];
            updateSelection({
              saleWindowId: value,
              offerId: offer?.id ?? selection.offerId,
              performanceId: offer?.performanceIds[0] ?? selection.performanceId,
              rateTypeId: offer?.rates[0]?.rateTypeId ?? selection.rateTypeId,
            });
          }}
        >
          {event.saleWindows.map((saleWindow) => (
            <option key={saleWindow.id} value={saleWindow.id}>
              {saleWindow.name}（{saleMethodLabels[saleWindow.saleMethod]}）
            </option>
          ))}
        </SelectField>

        <SelectField
          id="performanceId"
          label="公演"
          value={selection.performanceId}
          onChange={(value) => updateSelection({ performanceId: value })}
        >
          {selectablePerformances.map((performance) => (
            <option key={performance.id} value={performance.id}>
              {performance.name} / {formatDateTime(performance.startsAt)} /{" "}
              {admissionMethodLabels[performance.admissionMethod]}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="offerId"
          label="券種"
          value={selection.offerId}
          onChange={(value) => updateSelection({ offerId: value })}
        >
          {selectedSaleWindow?.offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.name} / {offer.seatCategoryName}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="rateTypeId"
          label="料金種別"
          value={selection.rateTypeId}
          onChange={(value) => updateSelection({ rateTypeId: value })}
        >
          {event.rateTypes.map((rateType) => {
            const offerRate = selectedOffer?.rates.find((rate) => rate.rateTypeId === rateType.id);

            if (!offerRate) {
              return null;
            }

            return (
              <option key={rateType.id} value={rateType.id}>
                {rateType.name} / {formatCurrency(offerRate.price)}
              </option>
            );
          })}
        </SelectField>

        <SelectField
          id="quantity"
          label="枚数"
          value={String(selection.quantity)}
          onChange={(value) => updateSelection({ quantity: Number(value) })}
        >
          {Array.from({ length: selectedOffer?.maxQuantityPerOrder ?? 1 }, (_, index) => {
            const quantity = index + 1;

            return (
              <option key={quantity} value={quantity}>
                {quantity}枚
              </option>
            );
          })}
        </SelectField>
      </div>

      <section aria-label="申し込み金額" className="space-y-3 border-t pt-5">
        <LineItem label={`${quote.offer.name} ${quote.rateType.name}`} value={quote.unitPrice} />
        <LineItem label="小計" value={quote.subtotalAmount} note={`${quote.quantity}枚`} />
        {quote.buyerFeeLines.map((feeLine) => (
          <LineItem key={feeLine.id} label={feeLine.name} value={feeLine.amount} />
        ))}
        <div className="flex items-center justify-between border-t pt-3 text-lg font-semibold">
          <span>合計</span>
          <span>{formatCurrency(quote.totalAmount)}</span>
        </div>
        <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
          <WalletCards className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          主催者負担手数料は購入者の支払額には含めず、精算時に差し引く想定です。
        </p>
      </section>

      <Button type="submit" size="lg" className="w-full text-sm">
        申し込み内容を確定
      </Button>
    </form>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30",
        )}
      >
        {children}
      </select>
    </div>
  );
}

function LineItem({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">
        {label}
        {note ? <span className="ml-2 text-xs">({note})</span> : null}
      </span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
