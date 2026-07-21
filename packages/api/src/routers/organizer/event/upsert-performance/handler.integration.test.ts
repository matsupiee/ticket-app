import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { upsertPerformanceHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event upsert-performance handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/upsertPerformance`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        json: {},
      }),
    });

    expect(response.status).toBe(401);
  });

  it("performanceIdを指定しない場合、会場と公演を新規作成する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    const result = await upsertPerformanceHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "DAY 1",
        venueName: "有明アリーナ",
        doorsOpenAt: "2026-09-12T17:00:00+09:00",
        startsAt: "2026-09-12T18:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result).toEqual({ id: expect.any(String), updatedAt: expect.any(String) });

    const performance = await db.performance.findUniqueOrThrow({
      where: { id: result.id },
      include: { venue: true },
    });
    expect(performance.name).toBe("DAY 1");
    expect(performance.eventId).toBe(event.id);
    expect(performance.venue.name).toBe("有明アリーナ");
    expect(performance.doorsOpenAt.toISOString()).toBe("2026-09-12T08:00:00.000Z");
    expect(performance.startsAt.toISOString()).toBe("2026-09-12T09:00:00.000Z");
  });

  it("同一イベント内で同名の会場を指定すると、Venueを新規作成せず再利用する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    const first = await upsertPerformanceHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "DAY 1",
        venueName: "横浜ベイホール",
        doorsOpenAt: "2026-10-03T10:00:00+09:00",
        startsAt: "2026-10-03T11:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      context: { session: { user: { id: editor.id } } },
    });
    const second = await upsertPerformanceHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "DAY 2",
        venueName: "横浜ベイホール",
        doorsOpenAt: "2026-10-04T10:00:00+09:00",
        startsAt: "2026-10-04T11:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      context: { session: { user: { id: editor.id } } },
    });

    const [firstPerformance, secondPerformance] = await Promise.all([
      db.performance.findUniqueOrThrow({ where: { id: first.id } }),
      db.performance.findUniqueOrThrow({ where: { id: second.id } }),
    ]);
    expect(secondPerformance.venueId).toBe(firstPerformance.venueId);

    const venueCount = await db.venue.count({ where: { name: "横浜ベイホール" } });
    expect(venueCount).toBe(1);
  });

  it("performanceIdを指定すると、既存の公演を更新する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const created = await upsertPerformanceHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "本公演",
        venueName: "新宿ライブホール",
        doorsOpenAt: "2026-09-12T17:00:00+09:00",
        startsAt: "2026-09-12T18:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      context: { session: { user: { id: editor.id } } },
    });

    const updated = await upsertPerformanceHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        performanceId: created.id,
        name: "追加公演",
        venueName: "渋谷ライブホール",
        doorsOpenAt: "2026-09-13T17:00:00+09:00",
        startsAt: "2026-09-13T18:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(updated.id).toBe(created.id);
    const performance = await db.performance.findUniqueOrThrow({
      where: { id: created.id },
      include: { venue: true },
    });
    expect(performance.name).toBe("追加公演");
    expect(performance.venue.name).toBe("渋谷ライブホール");

    const performanceCount = await db.performance.count({ where: { eventId: event.id } });
    expect(performanceCount).toBe(1);
  });

  it("開場日時が開演日時以降の場合はBAD_REQUESTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    await expect(
      upsertPerformanceHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "DAY 1",
          venueName: "有明アリーナ",
          doorsOpenAt: "2026-09-12T19:00:00+09:00",
          startsAt: "2026-09-12T18:00:00+09:00",
          admissionMethod: "NUMBERED_ENTRY",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("日時の形式が不正な場合はBAD_REQUESTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    await expect(
      upsertPerformanceHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "DAY 1",
          venueName: "有明アリーナ",
          doorsOpenAt: "not-a-date",
          startsAt: "2026-09-12T18:00:00+09:00",
          admissionMethod: "NUMBERED_ENTRY",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("他のイベントに属するperformanceIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const other = await seedEditorWithEvent();
    const otherPerformance = await upsertPerformanceHandler({
      input: {
        eventOrganizerId: other.organizer.id,
        eventId: other.event.id,
        name: "他イベントの公演",
        venueName: "他会場",
        doorsOpenAt: "2026-09-12T17:00:00+09:00",
        startsAt: "2026-09-12T18:00:00+09:00",
        admissionMethod: "NUMBERED_ENTRY",
      },
      context: { session: { user: { id: other.editor.id } } },
    });

    await expect(
      upsertPerformanceHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          performanceId: otherPerformance.id,
          name: "改ざん",
          venueName: "有明アリーナ",
          doorsOpenAt: "2026-09-12T17:00:00+09:00",
          startsAt: "2026-09-12T18:00:00+09:00",
          admissionMethod: "NUMBERED_ENTRY",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("このイベント内で使われていないvenueIdを指定するとBAD_REQUESTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const foreignVenue = await db.venue.create({ data: { name: "無関係の会場" } });

    await expect(
      upsertPerformanceHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "DAY 1",
          venueId: foreignVenue.id,
          venueName: "有明アリーナ",
          doorsOpenAt: "2026-09-12T17:00:00+09:00",
          startsAt: "2026-09-12T18:00:00+09:00",
          admissionMethod: "NUMBERED_ENTRY",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("存在しないeventIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor } = await seedEditorWithEvent();

    await expect(
      upsertPerformanceHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: "00000000-0000-0000-0000-000000000000",
          name: "DAY 1",
          venueName: "有明アリーナ",
          doorsOpenAt: "2026-09-12T17:00:00+09:00",
          startsAt: "2026-09-12T18:00:00+09:00",
          admissionMethod: "NUMBERED_ENTRY",
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const { organizer, event } = await seedEditorWithEvent();
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `viewer-${crypto.randomUUID()}@example.com` },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });

    await expect(
      upsertPerformanceHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "DAY 1",
          venueName: "有明アリーナ",
          doorsOpenAt: "2026-09-12T17:00:00+09:00",
          startsAt: "2026-09-12T18:00:00+09:00",
          admissionMethod: "NUMBERED_ENTRY",
        },
        context: { session: { user: { id: viewer.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("主催者に所属しないユーザーはFORBIDDENになる", async () => {
    const { organizer, event } = await seedEditorWithEvent();
    const outsider = await db.user.create({
      data: { name: "無関係ユーザー", email: `outsider-${crypto.randomUUID()}@example.com` },
    });

    await expect(
      upsertPerformanceHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "DAY 1",
          venueName: "有明アリーナ",
          doorsOpenAt: "2026-09-12T17:00:00+09:00",
          startsAt: "2026-09-12T18:00:00+09:00",
          admissionMethod: "NUMBERED_ENTRY",
        },
        context: { session: { user: { id: outsider.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

async function seedEditorWithEvent() {
  const suffix = crypto.randomUUID();
  const editor = await db.user.create({
    data: { name: "主催者ユーザー", email: `editor-${suffix}@example.com` },
  });
  const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
  const organizer = await db.organizer.create({
    data: { name: `テスト主催者 ${suffix}`, slug: `organizer-${suffix}`, companyId: company.id },
  });
  await db.organizerMember.create({
    data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
  });
  const event = await db.event.create({
    data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
  });

  return { editor, company, organizer, event };
}
