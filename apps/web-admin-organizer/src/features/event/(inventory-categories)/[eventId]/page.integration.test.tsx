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
const { EventInventoryCategoriesPage } = await import("./page");

describe("EventInventoryCategoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("席種を追加して公演ごとの在庫数を入力すると、席種を保存してから在庫の差分だけを反映する", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.editSalesSetting).mockResolvedValue({
      id: "event-existing",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(
      <EventInventoryCategoriesPage
        eventOrganizerId="organizer-1"
        event={
          {
            id: "event-existing",
            name: "既存イベント",
            description: "",
            publishesAt: null,
            closesAt: null,
            inventoryCategories: [],
            rateTypes: [],
            inventoryPools: [],
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
          } satisfies EventGetOutput
        }
      />,
    );

    await user.click(screen.getByRole("button", { name: "＋ 席種を追加" }));
    await user.type(screen.getByLabelText("席種1の名称"), "S席");

    const capacityInput = screen.getByLabelText("DAY 1 × S席の在庫数");
    await user.clear(capacityInput);
    await user.type(capacityInput, "120");

    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(client.organizer.event.editSalesSetting).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-existing",
          inventoryCategories: [
            expect.objectContaining({ name: "S席", kind: "ENTRY_NUMBER", displayOrder: 0 }),
          ],
        }),
      );
    });

    // 在庫は「公演 × 在庫種別」を在庫種別のkeyで参照し、あるべき枚数をそのまま送る
    const [savedInput] = vi.mocked(client.organizer.event.editSalesSetting).mock.calls[0] ?? [];
    expect(savedInput?.inventories).toEqual([
      {
        stageId: "stage-1",
        inventoryCategoryKey: savedInput?.inventoryCategories[0]?.key,
        capacity: 120,
      },
    ]);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        to: "/events/$eventId",
        params: { eventId: "event-existing" },
      });
    });
  });

  it("公演が1件も無いときは在庫を設定できないことを伝え、席種の入力欄を出さない", () => {
    render(
      <EventInventoryCategoriesPage
        eventOrganizerId="organizer-1"
        event={
          {
            id: "event-existing",
            name: "既存イベント",
            description: "",
            publishesAt: null,
            closesAt: null,
            inventoryCategories: [],
            rateTypes: [],
            inventoryPools: [],
            stages: [],
            saleWindows: [],
            sales: { grossSales: 0, ticketsSold: 0 },
          } satisfies EventGetOutput
        }
      />,
    );

    expect(
      screen.getByText("在庫は公演ごとに持つため、先に公演を1件以上登録してください。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "＋ 席種を追加" })).not.toBeInTheDocument();
  });
});
