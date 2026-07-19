import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { cn } from "@ticket-app/ui/lib/utils";
import { useState } from "react";

import {
  type OrganizerEvent,
  type OrganizerEventSettings,
  eventStatusLabels,
  saleMethodLabels,
} from "../_utils/operations";

export function EventSettingsForm({
  event,
  onSave,
}: {
  event: OrganizerEvent;
  onSave: (settings: OrganizerEventSettings) => void;
}) {
  const firstPerformance = event.performances[0];
  const firstSaleWindow = event.saleWindows[0];
  const [settings, setSettings] = useState<OrganizerEventSettings>({
    name: event.name,
    status: event.status,
    venueName: firstPerformance?.venueName ?? "",
    saleMethod: firstSaleWindow?.saleMethod ?? "FIRST_COME",
  });

  return (
    <form
      className="space-y-5 border-y py-5"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        onSave(settings);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="eventName">イベント名</Label>
          <Input
            id="eventName"
            value={settings.name}
            onChange={(eventNameChange) =>
              setSettings((current) => ({ ...current, name: eventNameChange.target.value }))
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="eventStatus">販売状態</Label>
          <select
            id="eventStatus"
            value={settings.status}
            onChange={(statusChange) =>
              setSettings((current) => ({
                ...current,
                status: statusChange.target.value as OrganizerEventSettings["status"],
              }))
            }
            className={selectClassName}
          >
            {Object.entries(eventStatusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="venueName">会場</Label>
          <Input
            id="venueName"
            value={settings.venueName}
            onChange={(venueChange) =>
              setSettings((current) => ({ ...current, venueName: venueChange.target.value }))
            }
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="saleMethod">販売方式</Label>
          <select
            id="saleMethod"
            value={settings.saleMethod}
            onChange={(methodChange) =>
              setSettings((current) => ({
                ...current,
                saleMethod: methodChange.target.value as OrganizerEventSettings["saleMethod"],
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

      <Button type="submit" className="text-sm">
        設定を保存
      </Button>
    </form>
  );
}

const selectClassName = cn(
  "h-8 w-full border border-input bg-background px-2.5 text-xs outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30",
);
