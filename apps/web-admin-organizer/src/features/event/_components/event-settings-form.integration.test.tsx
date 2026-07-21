import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { organizerEvents } from "../_utils/operations";

import { EventSettingsForm, buildEventFormValues } from "./event-settings-form";

describe("EventSettingsForm", () => {
  it("イベント設定を編集して保存できる", async () => {
    const user = userEvent.setup();
    const event = organizerEvents[0];

    if (!event) {
      throw new Error("fixture event is missing");
    }

    const handleSave = vi.fn();

    render(
      <EventSettingsForm
        defaultValues={buildEventFormValues(event)}
        submitLabel="設定を保存"
        pendingLabel="保存中"
        onSave={handleSave}
      />,
    );

    await user.clear(screen.getByLabelText("イベント名"));
    await user.type(screen.getByLabelText("イベント名"), "TOKYO ORBIT 2026 追加公演");
    await user.click(screen.getByRole("button", { name: "設定を保存" }));

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "TOKYO ORBIT 2026 追加公演",
      }),
    );
  });

  it("既存イベントの編集項目をデフォルト値へ反映する", () => {
    const event = organizerEvents[0];

    if (!event) {
      throw new Error("fixture event is missing");
    }

    expect(buildEventFormValues(event)).toEqual(
      expect.objectContaining({
        doorsOpenAt: "2026-09-12T17:00",
        maxQuantityPerOrder: "4",
        saleMethod: "FIRST_COME",
      }),
    );
  });
});
