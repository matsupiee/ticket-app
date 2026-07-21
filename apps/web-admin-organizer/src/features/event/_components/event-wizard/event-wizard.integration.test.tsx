import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/orpc", () => ({
  client: {
    organizer: {
      event: {
        create: vi.fn(),
        update: vi.fn(),
        upsertPerformance: vi.fn(),
        upsertSeatCategory: vi.fn(),
        upsertRateType: vi.fn(),
        adjustInventory: vi.fn(),
        upsertSaleWindow: vi.fn(),
        upsertSaleOffer: vi.fn(),
        cancelSaleWindow: vi.fn(),
      },
    },
  },
}));

const { client } = await import("@/lib/orpc");
const { EventWizard } = await import("./event-wizard");

describe("EventWizard", () => {
  it("Step1を保存するとイベントを作成し、Step2で作成済みeventIdを使って公演を保存する", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.create).mockResolvedValue({
      id: "event-123",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.upsertPerformance).mockResolvedValue({
      id: "performance-1",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventWizard mode="create" eventOrganizerId="organizer-1" />);

    await user.type(screen.getByLabelText("イベント名"), "TOKYO ORBIT 2026");
    await user.type(screen.getByLabelText("説明"), "テスト説明文");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await waitFor(() => {
      expect(client.organizer.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          name: "TOKYO ORBIT 2026",
          description: "テスト説明文",
        }),
      );
    });

    expect(await screen.findByRole("heading", { name: "公演" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("会場"), "有明アリーナ");
    await user.click(screen.getByRole("button", { name: "＋ 公演を追加" }));
    await user.type(screen.getByLabelText("公演1の名称"), "DAY 1");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await waitFor(() => {
      expect(client.organizer.event.upsertPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-123",
          name: "DAY 1",
          venueName: "有明アリーナ",
        }),
      );
    });
  });

  it("編集モードでは既存イベントの内容をStep1に反映する", () => {
    render(
      <EventWizard mode="edit" eventOrganizerId="organizer-1" initialEvent={buildMinimalEvent()} />,
    );

    expect(screen.getByLabelText("イベント名")).toHaveValue("既存イベント");
    expect(screen.getByLabelText("説明")).toHaveValue("既存の説明");
  });
});

function buildMinimalEvent() {
  return {
    id: "event-existing",
    name: "既存イベント",
    description: "既存の説明",
    status: "DRAFT" as const,
    location: "会場未定",
    tags: [],
    seatCategories: [],
    rateTypes: [],
    inventoryPools: [],
    performances: [],
    saleWindows: [],
    sales: { grossSales: 0, ticketsSold: 0, buyerFeeAmount: 0, organizerFeeAmount: 0 },
    settlement: { status: "SCHEDULED" as const, scheduledAt: "2026-08-01T00:00:00.000Z" },
  };
}
