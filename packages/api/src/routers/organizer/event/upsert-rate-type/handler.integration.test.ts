import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { upsertRateTypeHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event upsert-rate-type handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/upsertRateType`, {
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

  it("rateTypeIdを指定しない場合、料金種別を新規作成する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    const result = await upsertRateTypeHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "大人",
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result).toEqual({ id: expect.any(String), updatedAt: expect.any(String) });
    const rateType = await db.rateType.findUniqueOrThrow({ where: { id: result.id } });
    expect(rateType.name).toBe("大人");
    expect(rateType.eventId).toBe(event.id);
  });

  it("rateTypeIdを指定すると、既存の料金種別を更新する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const created = await upsertRateTypeHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "大人",
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });

    const updated = await upsertRateTypeHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        rateTypeId: created.id,
        name: "U-22",
        displayOrder: 1,
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(updated.id).toBe(created.id);
    const rateType = await db.rateType.findUniqueOrThrow({ where: { id: created.id } });
    expect(rateType.name).toBe("U-22");
    expect(rateType.displayOrder).toBe(1);

    const count = await db.rateType.count({ where: { eventId: event.id } });
    expect(count).toBe(1);
  });

  it("同一イベント内で新規作成時に名前が重複しているとCONFLICTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    await upsertRateTypeHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "大人",
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });

    await expect(
      upsertRateTypeHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "大人",
          displayOrder: 1,
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const count = await db.rateType.count({ where: { eventId: event.id, name: "大人" } });
    expect(count).toBe(1);
  });

  it("更新時に別の料金種別と同じ名前へ改名しようとするとCONFLICTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    await upsertRateTypeHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "大人",
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });
    const child = await upsertRateTypeHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "子供",
        displayOrder: 1,
      },
      context: { session: { user: { id: editor.id } } },
    });

    await expect(
      upsertRateTypeHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          rateTypeId: child.id,
          name: "大人",
          displayOrder: 1,
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("他のイベントに属するrateTypeIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const other = await seedEditorWithEvent();
    const otherRateType = await upsertRateTypeHandler({
      input: {
        eventOrganizerId: other.organizer.id,
        eventId: other.event.id,
        name: "大人",
        displayOrder: 0,
      },
      context: { session: { user: { id: other.editor.id } } },
    });

    await expect(
      upsertRateTypeHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          rateTypeId: otherRateType.id,
          name: "改ざん",
          displayOrder: 0,
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
      upsertRateTypeHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "大人",
          displayOrder: 0,
        },
        context: { session: { user: { id: viewer.id } } },
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
