import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventGetOutput } from "@ticket-app/api/routers/organizer/event/get/route";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  useNavigate: () => navigate,
}));

vi.mock("@/lib/orpc", () => ({
  client: {
    organizer: {
      event: {
        editSalesSetting: vi.fn(),
      },
    },
  },
}));

const { client } = await import("@/lib/orpc");
const { EventSaleWindowsPage } = await import("./page");

// 公演・席種・料金種別が保存済みのイベント。販売受付だけがまだ無い状態を表す。
function buildConfiguredEvent(): EventGetOutput {
  return {
    id: "event-existing",
    name: "既存イベント",
    description: "",
    publishesAt: null,
    closesAt: null,
    inventoryCategories: [
      {
        id: "inventory-category-1",
        kind: "ENTRY_NUMBER" as const,
        name: "S席",
        description: "",
        displayOrder: 0,
        entryNumberPrefix: null,
      },
    ],
    rateTypes: [{ id: "rate-type-1", name: "一般", displayOrder: 0 }],
    inventoryPools: [
      {
        id: "pool-1",
        stageId: "stage-1",
        inventoryCategoryId: "inventory-category-1",
        capacity: 100,
        availableQuantity: 100,
      },
    ],
    stages: [
      {
        id: "stage-1",
        name: "DAY 1",
        venueName: "有明アリーナ",
        venueId: "venue-1",
        startsAt: "2026-09-12T09:00:00.000Z",
        doorsOpenAt: "2026-09-12T08:00:00.000Z",
      },
    ],
    saleWindows: [],
    sales: { grossSales: 0, ticketsSold: 0 },
  };
}

describe("EventSaleWindowsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("受付と券を登録して保存すると、販売設定をまとめて editSalesSetting へ送る", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.editSalesSetting).mockResolvedValue({
      id: "event-existing",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventSaleWindowsPage eventOrganizerId="organizer-1" event={buildConfiguredEvent()} />);

    await user.click(screen.getByRole("button", { name: "＋ 受付を追加（一般販売など）" }));
    await user.type(screen.getByLabelText("受付名"), "一般販売");
    await user.type(screen.getByLabelText("申込開始"), "2026-08-01T10:00");
    await user.type(screen.getByLabelText("申込終了"), "2026-09-10T23:59");

    await user.click(screen.getByRole("button", { name: "＋ 券を追加" }));
    const priceInput = await screen.findByLabelText("一般の価格");
    await user.clear(priceInput);
    await user.type(priceInput, "8000");
    await user.click(screen.getByRole("button", { name: "追加する" }));

    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(client.organizer.event.editSalesSetting).toHaveBeenCalledWith(
        expect.objectContaining({ eventOrganizerId: "organizer-1", eventId: "event-existing" }),
      );
    });

    const [savedInput] = vi.mocked(client.organizer.event.editSalesSetting).mock.calls[0] ?? [];
    const savedSaleWindow = savedInput?.saleWindows[0];
    expect(savedSaleWindow).toMatchObject({
      name: "一般販売",
      applicationStartsAt: "2026-08-01T10:00",
      applicationEndsAt: "2026-09-10T23:59",
      saleMethod: "FIRST_COME",
    });
    // 券は在庫種別と料金種別をkeyで参照する。ここでは保存済みなのでkeyは実IDになる
    expect(savedSaleWindow?.offers).toEqual([
      expect.objectContaining({
        name: "S席",
        rates: [{ rateTypeKey: "rate-type-1", price: 8000 }],
        entitlements: [{ stageId: "stage-1", inventoryCategoryKey: "inventory-category-1" }],
      }),
    ]);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        to: "/events/$eventId",
        params: { eventId: "event-existing" },
      });
    });
  });

  it("公演か席種が未設定のときは、先に設定が必要なことを伝える", () => {
    const event = buildConfiguredEvent();

    render(
      <EventSaleWindowsPage
        eventOrganizerId="organizer-1"
        event={{ ...event, inventoryCategories: [], inventoryPools: [] }}
      />,
    );

    expect(
      screen.getByText("券は「公演 × 席種」の在庫に紐づきます。先に公演と席種を登録してください。"),
    ).toBeInTheDocument();
  });
});
