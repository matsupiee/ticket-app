import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { cn } from "@ticket-app/ui/lib/utils";
import { useState } from "react";

import { type OrganizerEvent, type SaleMethod, saleMethodLabels } from "../_utils/operations";

export type EventSettingsFormValues = {
  name: string;
  description: string;
  venueName: string;
  seatCategoryName: string;
  rateTypeName: string;
  price: string;
  capacity: string;
  maxQuantityPerOrder: string;
  startsAt: string;
  doorsOpenAt: string;
  saleStartsAt: string;
  saleEndsAt: string;
  saleMethod: SaleMethod;
};

export function EventSettingsForm({
  defaultValues,
  submitLabel,
  pendingLabel,
  isSubmitting = false,
  onSave,
}: {
  defaultValues?: EventSettingsFormValues;
  submitLabel: string;
  pendingLabel: string;
  isSubmitting?: boolean;
  onSave: (settings: EventSettingsFormValues) => void | Promise<void>;
}) {
  const [settings, setSettings] = useState<EventSettingsFormValues>(
    () => defaultValues ?? buildDefaultEventFormValues(),
  );
  const [isSaving, setIsSaving] = useState(false);

  return (
    <form
      className="space-y-5 border-y py-5"
      onSubmit={async (submitEvent) => {
        submitEvent.preventDefault();
        setIsSaving(true);
        try {
          await onSave(settings);
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          id="eventName"
          label="イベント名"
          value={settings.name}
          onChange={(name) => setSettings((current) => ({ ...current, name }))}
        />
        <TextField
          id="venueName"
          label="会場"
          value={settings.venueName}
          onChange={(venueName) => setSettings((current) => ({ ...current, venueName }))}
        />
        <TextField
          id="seatCategoryName"
          label="席種"
          value={settings.seatCategoryName}
          onChange={(seatCategoryName) =>
            setSettings((current) => ({ ...current, seatCategoryName }))
          }
        />
        <TextField
          id="rateTypeName"
          label="料金種別"
          value={settings.rateTypeName}
          onChange={(rateTypeName) => setSettings((current) => ({ ...current, rateTypeName }))}
        />
        <TextField
          id="price"
          label="価格"
          type="number"
          value={settings.price}
          onChange={(price) => setSettings((current) => ({ ...current, price }))}
        />
        <TextField
          id="capacity"
          label="販売枚数"
          type="number"
          value={settings.capacity}
          onChange={(capacity) => setSettings((current) => ({ ...current, capacity }))}
        />
        <TextField
          id="maxQuantityPerOrder"
          label="1注文あたり上限枚数"
          type="number"
          value={settings.maxQuantityPerOrder}
          onChange={(maxQuantityPerOrder) =>
            setSettings((current) => ({ ...current, maxQuantityPerOrder }))
          }
        />
        <TextField
          id="startsAt"
          label="開演日時"
          type="datetime-local"
          value={settings.startsAt}
          onChange={(startsAt) => setSettings((current) => ({ ...current, startsAt }))}
        />
        <TextField
          id="doorsOpenAt"
          label="開場日時"
          type="datetime-local"
          value={settings.doorsOpenAt}
          onChange={(doorsOpenAt) => setSettings((current) => ({ ...current, doorsOpenAt }))}
        />
        <TextField
          id="saleStartsAt"
          label="販売開始日時"
          type="datetime-local"
          value={settings.saleStartsAt}
          onChange={(saleStartsAt) => setSettings((current) => ({ ...current, saleStartsAt }))}
        />
        <TextField
          id="saleEndsAt"
          label="販売終了日時"
          type="datetime-local"
          value={settings.saleEndsAt}
          onChange={(saleEndsAt) => setSettings((current) => ({ ...current, saleEndsAt }))}
        />
        <div className="grid gap-2">
          <Label htmlFor="saleMethod">販売方式</Label>
          <select
            id="saleMethod"
            value={settings.saleMethod}
            onChange={(methodChange) =>
              setSettings((current) => ({
                ...current,
                saleMethod: methodChange.target.value as EventSettingsFormValues["saleMethod"],
              }))
            }
            className={selectClassName}
          >
            {Object.entries(saleMethodLabels).map(([method, label]) => (
              <option key={method} value={method}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">説明</Label>
        <Input
          id="description"
          value={settings.description}
          onChange={(descriptionChange) =>
            setSettings((current) => ({ ...current, description: descriptionChange.target.value }))
          }
        />
      </div>

      <Button type="submit" className="w-fit text-sm" disabled={isSubmitting || isSaving}>
        {isSubmitting || isSaving ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}

function buildDefaultEventFormValues(): EventSettingsFormValues {
  const now = new Date();
  const startsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  startsAt.setHours(18, 0, 0, 0);
  const doorsOpenAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const saleEndsAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  const saleStartsAt = new Date(now.getTime() - 60 * 1000);

  return {
    name: "整理番号ライブ",
    description: "整理番号順に入場する先着販売イベントです。",
    venueName: "新宿ライブホール",
    seatCategoryName: "スタンディング",
    rateTypeName: "一般",
    price: "5000",
    capacity: "30",
    maxQuantityPerOrder: "4",
    startsAt: toDateTimeLocalValue(startsAt),
    doorsOpenAt: toDateTimeLocalValue(doorsOpenAt),
    saleStartsAt: toDateTimeLocalValue(saleStartsAt),
    saleEndsAt: toDateTimeLocalValue(saleEndsAt),
    saleMethod: "FIRST_COME",
  };
}

export function buildEventFormValues(event: OrganizerEvent): EventSettingsFormValues {
  const firstPerformance = event.performances[0];
  const firstSaleWindow = event.saleWindows[0];
  const firstOffer = firstSaleWindow?.offers[0];

  return {
    ...buildDefaultEventFormValues(),
    name: event.name,
    description: event.description,
    venueName: firstPerformance?.venueName ?? event.location,
    seatCategoryName: firstOffer?.seatCategoryName ?? "",
    rateTypeName: firstOffer?.name ?? "一般",
    price: firstOffer ? String(firstOffer.minPrice) : "",
    capacity: firstOffer ? String(firstOffer.soldQuantity + firstOffer.availableQuantity) : "",
    maxQuantityPerOrder: firstOffer ? String(firstOffer.maxQuantityPerOrder) : "",
    startsAt: firstPerformance ? toDateTimeLocalValue(new Date(firstPerformance.startsAt)) : "",
    doorsOpenAt: firstPerformance
      ? toDateTimeLocalValue(new Date(firstPerformance.doorsOpenAt))
      : "",
    saleStartsAt: firstSaleWindow ? toDateTimeLocalValue(new Date(firstSaleWindow.opensAt)) : "",
    saleEndsAt: firstSaleWindow ? toDateTimeLocalValue(new Date(firstSaleWindow.closesAt)) : "",
    saleMethod: firstSaleWindow?.saleMethod ?? "FIRST_COME",
  };
}

function TextField({
  id,
  label,
  value,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required
        min={type === "number" ? 1 : undefined}
        step={type === "number" ? 1 : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const selectClassName = cn(
  "h-8 w-full border border-input bg-background px-2.5 text-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30",
);
