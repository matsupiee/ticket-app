import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetEventOutput } from "@ticket-app/api/routers/organizer/event/get/route";

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
const { getDefaultPerformanceSchedule } = await import("./performance-schedule");

describe("EventWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("Step1を保存するとイベントを作成し、Step2で作成済みeventIdを使って公演ごとの会場と日程を保存する", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 6, 21, 10, 0));
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

    await user.click(screen.getByRole("button", { name: /詳細イベント作成ではじめる/ }));
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
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /席種/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "公演を追加" }));
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /席種/ })).toBeEnabled();
    const defaultSchedule = getDefaultPerformanceSchedule();
    expect(screen.getByLabelText("公演1の月日")).toHaveValue(defaultSchedule.performanceDate);
    expect(screen.getByLabelText("公演1の開場時刻")).toHaveValue("18:00");
    expect(screen.getByLabelText("公演1の開始時刻")).toHaveValue("18:00");
    await user.type(screen.getByLabelText("公演1の名称"), "DAY 1");
    await user.type(screen.getByLabelText("公演1の会場"), "有明アリーナ");
    await user.clear(screen.getByLabelText("公演1の月日"));
    await user.type(screen.getByLabelText("公演1の月日"), "2026-09-12");
    await user.clear(screen.getByLabelText("公演1の開場時刻"));
    await user.type(screen.getByLabelText("公演1の開場時刻"), "23:30");
    await user.clear(screen.getByLabelText("公演1の開始時刻"));
    await user.type(screen.getByLabelText("公演1の開始時刻"), "00:00");
    await user.click(screen.getByRole("button", { name: "公演を追加" }));
    await user.type(screen.getByLabelText("公演2の名称"), "DAY 2");
    await user.type(screen.getByLabelText("公演2の会場"), "幕張メッセ");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await waitFor(() => {
      expect(client.organizer.event.upsertPerformance).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-123",
          name: "DAY 1",
          venueName: "有明アリーナ",
          doorsOpenAt: "2026-09-12T23:30",
          startsAt: "2026-09-13T00:00",
        }),
      );
      expect(client.organizer.event.upsertPerformance).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-123",
          name: "DAY 2",
          venueName: "幕張メッセ",
          doorsOpenAt: "2026-07-28T18:00",
          startsAt: "2026-07-28T18:00",
        }),
      );
    });
  });

  it("公演を追加しないとStep3へ直接移動できない", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.create).mockResolvedValue({
      id: "event-123",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventWizard mode="create" eventOrganizerId="organizer-1" />);

    await user.click(screen.getByRole("button", { name: /詳細イベント作成ではじめる/ }));
    await user.type(screen.getByLabelText("イベント名"), "TOKYO ORBIT 2026");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(await screen.findByRole("heading", { name: "公演" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /席種/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "公演を追加" }));
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /席種/ })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "公演1を削除" }));
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /席種/ })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "公演" })).toBeInTheDocument();
  });

  it("作成方法を選び直すと未保存ドラフトを初期化し、詳細作成の公演必須ガードを維持する", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.create).mockResolvedValue({
      id: "event-123",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventWizard mode="create" eventOrganizerId="organizer-1" />);

    await user.click(screen.getByRole("button", { name: /簡単イベント作成/ }));
    await user.click(screen.getByRole("button", { name: "作成方法を変更" }));
    await user.click(screen.getByRole("button", { name: /詳細イベント作成ではじめる/ }));
    await user.type(screen.getByLabelText("イベント名"), "選び直しイベント");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(await screen.findByRole("heading", { name: "公演" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /席種/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "作成方法を変更" })).not.toBeInTheDocument();
  });

  it("簡単作成は料金種別ステップを出さずに同じイベントAPIで保存する", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.create).mockResolvedValue({
      id: "event-simple",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.upsertPerformance).mockResolvedValue({
      id: "performance-simple",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.upsertSeatCategory).mockResolvedValue({
      id: "seat-category-simple",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.upsertRateType).mockResolvedValue({
      id: "rate-type-simple",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.adjustInventory).mockResolvedValue({
      id: "pool-simple",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.upsertSaleWindow).mockResolvedValue({
      id: "sale-window-simple",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.upsertSaleOffer).mockResolvedValue({
      id: "offer-simple",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventWizard mode="create" eventOrganizerId="organizer-1" />);

    await user.click(screen.getByRole("button", { name: /簡単イベント作成/ }));
    await user.type(screen.getByLabelText("イベント名"), "E2E簡単イベント");
    await user.type(screen.getByLabelText("説明"), "簡単作成のテストです。");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(await screen.findByRole("heading", { name: "公演・券種" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("公演の名称"), "本公演");
    await user.type(screen.getByLabelText("公演の会場"), "渋谷ホール");
    await user.clear(screen.getByLabelText("席種1の在庫数"));
    await user.type(screen.getByLabelText("席種1の在庫数"), "80");
    await user.clear(screen.getByLabelText("席種1の価格"));
    await user.type(screen.getByLabelText("席種1の価格"), "4500");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await waitFor(() => {
      expect(client.organizer.event.upsertPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-simple",
          name: "本公演",
          venueName: "渋谷ホール",
        }),
      );
      expect(client.organizer.event.upsertSeatCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-simple",
          name: "一般",
        }),
      );
      expect(client.organizer.event.upsertRateType).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-simple",
          name: "一般",
        }),
      );
      expect(client.organizer.event.adjustInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-simple",
          performanceId: "performance-simple",
          seatCategoryId: "seat-category-simple",
          capacityDelta: 80,
        }),
      );
    });

    expect(await screen.findByRole("heading", { name: "販売受付" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "＋ 受付を追加（一般販売など）" }));
    await user.type(screen.getByLabelText("受付名"), "一般販売");
    await user.type(screen.getByLabelText("申込開始"), "2026-08-01T10:00");
    await user.type(screen.getByLabelText("申込終了"), "2026-08-20T23:59");
    await user.click(screen.getByRole("button", { name: "＋ 券を追加" }));

    expect(screen.queryByRole("button", { name: "通し券（複数公演）" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "追加する" }));
    await user.click(screen.getByRole("button", { name: "作成して公開" }));

    await waitFor(() => {
      expect(client.organizer.event.upsertSaleOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-simple",
          saleWindowId: "sale-window-simple",
          rates: [
            expect.objectContaining({
              rateTypeId: "rate-type-simple",
              price: 4500,
            }),
          ],
          entitlements: [
            {
              performanceId: "performance-simple",
              seatCategoryId: "seat-category-simple",
            },
          ],
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

  it("編集モードで既存公演の会場を変更すると公演ごとの会場名を保存する", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.upsertPerformance).mockResolvedValue({
      id: "performance-existing",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(
      <EventWizard
        mode="edit"
        eventOrganizerId="organizer-1"
        initialEvent={buildMinimalEvent({
          performances: [
            {
              id: "performance-existing",
              name: "本公演",
              venueName: "旧ホール",
              venueId: "venue-existing",
              startsAt: "2026-08-20T18:00:00.000Z",
              doorsOpenAt: "2026-08-20T17:00:00.000Z",
              admissionMethod: "NUMBERED_ENTRY",
            },
          ],
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(await screen.findByRole("heading", { name: "公演" })).toBeInTheDocument();

    const venueInput = await screen.findByLabelText("公演1の会場");
    await user.clear(venueInput);
    await user.type(venueInput, "新ホール");
    await user.click(screen.getByRole("button", { name: "次へ" }));

    await waitFor(() => {
      expect(client.organizer.event.upsertPerformance).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-existing",
          performanceId: "performance-existing",
          name: "本公演",
          venueName: "新ホール",
        }),
      );
    });
  });
});

function buildMinimalEvent(overrides: Partial<GetEventOutput> = {}): GetEventOutput {
  return { ...buildMinimalEventBase(), ...overrides };
}

function buildMinimalEventBase(): GetEventOutput {
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
