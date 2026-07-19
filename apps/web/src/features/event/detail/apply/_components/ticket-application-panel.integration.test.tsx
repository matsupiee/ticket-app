import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { getDefaultApplicationSelection, ticketEvents } from "../../../_utils/ticketing";

import { TicketApplicationPanel } from "./ticket-application-panel";

describe("TicketApplicationPanel", () => {
  it("選択内容に応じて支払予定額を更新し、確定時に選択内容を渡す", async () => {
    const user = userEvent.setup();
    const event = ticketEvents[0];

    if (!event) {
      throw new Error("fixture event is missing");
    }

    const handleComplete = vi.fn();

    render(
      <TicketApplicationPanel
        event={event}
        initialSelection={getDefaultApplicationSelection(event)}
        onComplete={handleComplete}
      />,
    );

    await user.selectOptions(screen.getByLabelText("枚数"), "2");

    const amountSection = screen.getByLabelText("申し込み金額");
    expect(within(amountSection).getByText("￥24,660")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "申し込み内容を確定" }));

    expect(handleComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "tokyo-orbit-2026",
        offerId: "tokyo-orbit-s-seat",
        quantity: 2,
      }),
    );
  });
});
