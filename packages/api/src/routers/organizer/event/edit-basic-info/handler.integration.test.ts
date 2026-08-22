import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { handler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event edit-basic-info handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/editBasicInfo`, {
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

  it("基本情報を更新し、既存公演の変更と新規公演の追加を同時に反映する", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `edit-basic-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `旧イベント名 ${suffix}`, description: "旧説明" },
    });
    const venue = await db.venue.create({ data: { name: "旧ホール" } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "本公演",
        doorsOpenAt: new Date("2026-08-20T08:00:00.000Z"),
        startsAt: new Date("2026-08-20T09:00:00.000Z"),
      },
    });

    await handler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: `新イベント名 ${suffix}`,
        description: "新説明",
        publishesAt: "2026-07-25T10:00:00+09:00",
        closesAt: null,
        stages: [
          {
            stageId: stage.id,
            name: "DAY 1",
            venueName: "新ホール",
            doorsOpenAt: "2026-09-12T17:00:00+09:00",
            startsAt: "2026-09-12T18:00:00+09:00",
          },
          {
            name: "DAY 2",
            venueName: "新ホール",
            doorsOpenAt: "2026-09-13T17:00:00+09:00",
            startsAt: "2026-09-13T18:00:00+09:00",
          },
        ],
      },
      context: { session: { user: { id: editor.id } } },
    });

    const updated = await db.event.findUniqueOrThrow({
      where: { id: event.id },
      include: { stages: { include: { venue: true }, orderBy: { startsAt: "asc" } } },
    });
    expect(updated.name).toBe(`新イベント名 ${suffix}`);
    expect(updated.description).toBe("新説明");
    expect(updated.publishesAt?.toISOString()).toBe("2026-07-25T01:00:00.000Z");
    expect(updated.closesAt).toBeNull();
    expect(updated.stages).toHaveLength(2);
    expect(updated.stages[0]?.id).toBe(stage.id);
    expect(updated.stages[0]?.name).toBe("DAY 1");
    expect(updated.stages[0]?.venue.name).toBe("新ホール");
    expect(updated.stages[1]?.name).toBe("DAY 2");
    // 同名の会場はイベント内で共有する
    expect(updated.stages[1]?.venueId).toBe(updated.stages[0]?.venueId);
    // 会場は主催者をまたぐグローバルなテーブルなので、既存Venueの名前は書き換えない
    const oldVenue = await db.venue.findUniqueOrThrow({ where: { id: venue.id } });
    expect(oldVenue.name).toBe("旧ホール");
  });

  it("入力に含めなかった既存公演は削除しない", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `edit-keep-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `イベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "残る公演",
        doorsOpenAt: new Date("2026-08-20T08:00:00.000Z"),
        startsAt: new Date("2026-08-20T09:00:00.000Z"),
      },
    });

    await handler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: `イベント ${suffix}`,
        description: "",
        publishesAt: null,
        closesAt: null,
        stages: [],
      },
      context: { session: { user: { id: editor.id } } },
    });

    const stages = await db.stage.findMany({ where: { eventId: event.id } });
    expect(stages.map((item) => item.id)).toEqual([stage.id]);
  });

  it("他イベントの公演IDを指定するとNOT_FOUNDになり、基本情報も更新されない", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `edit-other-stage-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `対象イベント ${suffix}`, description: "" },
    });
    const otherEvent = await db.event.create({
      data: { organizerId: organizer.id, name: `別イベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `会場 ${suffix}` } });
    const otherStage = await db.stage.create({
      data: {
        eventId: otherEvent.id,
        venueId: venue.id,
        name: "別イベントの公演",
        doorsOpenAt: new Date("2026-08-20T08:00:00.000Z"),
        startsAt: new Date("2026-08-20T09:00:00.000Z"),
      },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: `書き換え後 ${suffix}`,
          description: "",
          publishesAt: null,
          closesAt: null,
          stages: [
            {
              stageId: otherStage.id,
              name: "乗っ取り",
              venueName: "会場",
              doorsOpenAt: "2026-09-12T17:00:00+09:00",
              startsAt: "2026-09-12T18:00:00+09:00",
            },
          ],
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // トランザクションが巻き戻り、イベント名も公演も変わっていない
    const unchangedEvent = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(unchangedEvent.name).toBe(`対象イベント ${suffix}`);
    const unchangedStage = await db.stage.findUniqueOrThrow({ where: { id: otherStage.id } });
    expect(unchangedStage.name).toBe("別イベントの公演");
  });

  it("他の主催者が所有するイベントはNOT_FOUNDになる", async () => {
    const suffix = crypto.randomUUID();
    const owner = await db.user.create({
      data: { name: "所有者", email: `edit-owner-${suffix}@example.com` },
    });
    const ownerCompany = await db.company.create({ data: { name: `所有者会社 ${suffix}` } });
    const ownerOrganizer = await db.organizer.create({
      data: { name: `所有者主催者 ${suffix}`, companyId: ownerCompany.id },
    });
    await db.organizerMember.create({
      data: { userId: owner.id, organizerId: ownerOrganizer.id, role: "EDITOR" },
    });
    const ownerEvent = await db.event.create({
      data: { organizerId: ownerOrganizer.id, name: `所有者のイベント ${suffix}`, description: "" },
    });

    const intruder = await db.user.create({
      data: { name: "侵入者", email: `edit-intruder-${suffix}@example.com` },
    });
    const intruderCompany = await db.company.create({ data: { name: `侵入者会社 ${suffix}` } });
    const intruderOrganizer = await db.organizer.create({
      data: { name: `侵入者主催者 ${suffix}`, companyId: intruderCompany.id },
    });
    await db.organizerMember.create({
      data: { userId: intruder.id, organizerId: intruderOrganizer.id, role: "EDITOR" },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: intruderOrganizer.id,
          eventId: ownerEvent.id,
          name: "乗っ取り",
          description: "",
          publishesAt: null,
          closesAt: null,
          stages: [],
        },
        context: { session: { user: { id: intruder.id } } },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const suffix = crypto.randomUUID();
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `edit-viewer-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `イベント ${suffix}`, description: "" },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "変更",
          description: "",
          publishesAt: null,
          closesAt: null,
          stages: [],
        },
        context: { session: { user: { id: viewer.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
