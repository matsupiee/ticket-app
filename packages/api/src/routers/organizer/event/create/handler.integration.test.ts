import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { handler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event create handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/create`, {
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

  it("イベントと公演をまとめて作成し、会場も作成する", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `create-editor-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });

    const result = await handler({
      input: {
        eventOrganizerId: organizer.id,
        name: `TOKYO ORBIT ${suffix}`,
        description: "説明文",
        publishesAt: "2026-07-25T10:00:00+09:00",
        closesAt: null,
        stages: [
          {
            name: "DAY 1",
            venueName: "有明アリーナ",
            doorsOpenAt: "2026-09-12T17:00:00+09:00",
            startsAt: "2026-09-12T18:00:00+09:00",
          },
        ],
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result).toEqual({ id: expect.any(String), updatedAt: expect.any(String) });
    const event = await db.event.findUniqueOrThrow({
      where: { id: result.id },
      include: { stages: { include: { venue: true } } },
    });
    expect(event.name).toBe(`TOKYO ORBIT ${suffix}`);
    expect(event.description).toBe("説明文");
    expect(event.publishesAt?.toISOString()).toBe("2026-07-25T01:00:00.000Z");
    expect(event.closesAt).toBeNull();
    expect(event.organizerId).toBe(organizer.id);
    expect(event.stages).toHaveLength(1);
    expect(event.stages[0]?.name).toBe("DAY 1");
    expect(event.stages[0]?.venue.name).toBe("有明アリーナ");
    expect(event.stages[0]?.doorsOpenAt.toISOString()).toBe("2026-09-12T08:00:00.000Z");
    expect(event.stages[0]?.startsAt.toISOString()).toBe("2026-09-12T09:00:00.000Z");
  });

  it("同じイベント内で同名の会場を指定した公演は、同じVenueを共有する", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `create-venue-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });

    const result = await handler({
      input: {
        eventOrganizerId: organizer.id,
        name: `2DAYS ${suffix}`,
        description: "",
        publishesAt: null,
        closesAt: null,
        stages: [
          {
            name: "DAY 1",
            venueName: "横浜ベイホール",
            doorsOpenAt: "2026-09-12T17:00:00+09:00",
            startsAt: "2026-09-12T18:00:00+09:00",
          },
          {
            name: "DAY 2",
            venueName: "横浜ベイホール",
            doorsOpenAt: "2026-09-13T17:00:00+09:00",
            startsAt: "2026-09-13T18:00:00+09:00",
          },
        ],
      },
      context: { session: { user: { id: editor.id } } },
    });

    const stages = await db.stage.findMany({ where: { eventId: result.id } });
    expect(stages).toHaveLength(2);
    expect(new Set(stages.map((stage) => stage.venueId)).size).toBe(1);
  });

  it("公演が0件でもイベントだけ作成できる", async () => {
    const suffix = crypto.randomUUID();
    const editor = await db.user.create({
      data: { name: "主催者ユーザー", email: `create-empty-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: editor.id, organizerId: organizer.id, role: "EDITOR" },
    });

    const result = await handler({
      input: {
        eventOrganizerId: organizer.id,
        name: `公演未定 ${suffix}`,
        description: "",
        publishesAt: null,
        closesAt: null,
        stages: [],
      },
      context: { session: { user: { id: editor.id } } },
    });

    const stages = await db.stage.findMany({ where: { eventId: result.id } });
    expect(stages).toHaveLength(0);
  });

  it("所属していない主催者のイベントは作成できない", async () => {
    const suffix = crypto.randomUUID();
    const intruder = await db.user.create({
      data: { name: "侵入者", email: `create-intruder-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: organizer.id,
          name: `勝手なイベント ${suffix}`,
          description: "",
          publishesAt: null,
          closesAt: null,
          stages: [],
        },
        context: { session: { user: { id: intruder.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const events = await db.event.findMany({ where: { organizerId: organizer.id } });
    expect(events).toHaveLength(0);
  });

  it("VIEWERロールのユーザーはイベントを作成できない", async () => {
    const suffix = crypto.randomUUID();
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `create-viewer-${suffix}@example.com` },
    });
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });

    await expect(
      handler({
        input: {
          eventOrganizerId: organizer.id,
          name: `閲覧者のイベント ${suffix}`,
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
