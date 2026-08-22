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
        create: vi.fn(),
        editBasicInfo: vi.fn(),
      },
    },
  },
}));

const { client } = await import("@/lib/orpc");
const { EventFormPage } = await import("./page");
const { getDefaultStageSchedule } = await import("@/features/event/_utils/stage-schedule");

describe("EventFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("基本情報と公演を入力して保存すると、公演ごと event.create に渡してイベント詳細へ移動する", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 6, 21, 10, 0));
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.create).mockResolvedValue({
      id: "event-123",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventFormPage mode="create" eventOrganizerId="organizer-1" />);

    await user.type(screen.getByLabelText("イベント名"), "TOKYO ORBIT 2026");
    await user.type(screen.getByLabelText("説明"), "テスト説明文");

    await user.click(screen.getByRole("button", { name: "公演を追加" }));
    const defaultSchedule = getDefaultStageSchedule();
    expect(screen.getByLabelText("公演1の月日")).toHaveValue(defaultSchedule.stageDate);
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

    await user.click(screen.getByRole("button", { name: "作成" }));

    await waitFor(() => {
      expect(client.organizer.event.create).toHaveBeenCalledWith({
        eventOrganizerId: "organizer-1",
        name: "TOKYO ORBIT 2026",
        description: "テスト説明文",
        publishesAt: null,
        closesAt: null,
        stages: [
          {
            name: "DAY 1",
            venueName: "有明アリーナ",
            doorsOpenAt: "2026-09-12T23:30",
            // 開始時刻が開場時刻より早いので翌日の開始日時として保存する
            startsAt: "2026-09-13T00:00",
          },
          {
            name: "DAY 2",
            venueName: "幕張メッセ",
            doorsOpenAt: "2026-07-28T18:00",
            startsAt: "2026-07-28T18:00",
          },
        ],
      });
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        to: "/events/$eventId",
        params: { eventId: "event-123" },
      });
    });
  });

  it("公演を登録しなくてもイベントだけ作成でき、下書きとして続きから設定できる", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.create).mockResolvedValue({
      id: "event-456",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventFormPage mode="create" eventOrganizerId="organizer-1" />);

    await user.type(screen.getByLabelText("イベント名"), "公演未定イベント");
    await user.click(screen.getByRole("button", { name: "作成" }));

    await waitFor(() => {
      expect(client.organizer.event.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "公演未定イベント", stages: [] }),
      );
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        to: "/events/$eventId",
        params: { eventId: "event-456" },
      });
    });
  });

  it("公開日時を入力すると公開期間つきで保存し、未入力なら下書きのままにする", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.create).mockResolvedValue({
      id: "event-789",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });
    vi.mocked(client.organizer.event.editBasicInfo).mockResolvedValue({
      id: "event-789",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(<EventFormPage mode="create" eventOrganizerId="organizer-1" />);

    await user.type(screen.getByLabelText("イベント名"), "公開予定イベント");
    await user.click(screen.getByRole("button", { name: "作成" }));

    // 公開日時を入れずに作成した場合は下書き（null）で保存する
    await waitFor(() => {
      expect(client.organizer.event.create).toHaveBeenCalledWith(
        expect.objectContaining({ publishesAt: null, closesAt: null }),
      );
    });

    await user.type(screen.getByLabelText("公開日時"), "2026-08-01T10:00");
    await user.type(screen.getByLabelText("公開終了日時"), "2026-09-30T23:59");
    await user.click(screen.getByRole("button", { name: "作成" }));

    await waitFor(() => {
      expect(client.organizer.event.editBasicInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: "event-789",
          publishesAt: "2026-08-01T10:00",
          closesAt: "2026-09-30T23:59",
        }),
      );
    });
  });

  it("イベント名が空のままではイベントを作成しない", async () => {
    const user = userEvent.setup();

    render(<EventFormPage mode="create" eventOrganizerId="organizer-1" />);

    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(client.organizer.event.create).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("編集モードでは既存イベントの基本情報を反映し、公演の会場変更を editBasicInfo で保存する", async () => {
    const user = userEvent.setup();
    vi.mocked(client.organizer.event.editBasicInfo).mockResolvedValue({
      id: "event-existing",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    render(
      <EventFormPage
        mode="edit"
        eventOrganizerId="organizer-1"
        event={
          {
            id: "event-existing",
            name: "既存イベント",
            description: "既存の説明",
            publishesAt: null,
            closesAt: null,
            inventoryCategories: [],
            rateTypes: [],
            inventoryPools: [],
            stages: [
              {
                id: "stage-existing",
                name: "本公演",
                venueName: "旧ホール",
                venueId: "venue-existing",
                startsAt: "2026-08-20T18:00:00.000Z",
                doorsOpenAt: "2026-08-20T17:00:00.000Z",
              },
            ],
            saleWindows: [],
            sales: { grossSales: 0, ticketsSold: 0 },
          } satisfies EventGetOutput
        }
      />,
    );

    expect(screen.getByLabelText("イベント名")).toHaveValue("既存イベント");
    expect(screen.getByLabelText("説明")).toHaveValue("既存の説明");

    const venueInput = screen.getByLabelText("公演1の会場");
    await user.clear(venueInput);
    await user.type(venueInput, "新ホール");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    await waitFor(() => {
      expect(client.organizer.event.editBasicInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          eventOrganizerId: "organizer-1",
          eventId: "event-existing",
          name: "既存イベント",
          stages: [expect.objectContaining({ stageId: "stage-existing", venueName: "新ホール" })],
        }),
      );
    });
  });
});
