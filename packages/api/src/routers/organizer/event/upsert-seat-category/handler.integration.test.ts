import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { upsertSeatCategoryHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event upsert-seat-category handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/upsertSeatCategory`, {
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

  it("seatCategoryIdを指定しない場合、席種を新規作成する", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();

    const result = await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "S席",
        description: "ステージ近くの席種",
        active: true,
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result).toEqual({ id: expect.any(String), updatedAt: expect.any(String) });
    const seatCategory = await db.seatCategory.findUniqueOrThrow({ where: { id: result.id } });
    expect(seatCategory.name).toBe("S席");
    expect(seatCategory.description).toBe("ステージ近くの席種");
    expect(seatCategory.active).toBe(true);
    expect(seatCategory.eventId).toBe(event.id);
  });

  it("seatCategoryIdを指定すると、既存の席種を更新する(activeのfalse化を含む)", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const created = await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "S席",
        description: "",
        active: true,
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });

    const updated = await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        seatCategoryId: created.id,
        name: "S席",
        description: "販売終了",
        active: false,
        displayOrder: 1,
      },
      context: { session: { user: { id: editor.id } } },
    });

    expect(updated.id).toBe(created.id);
    const seatCategory = await db.seatCategory.findUniqueOrThrow({ where: { id: created.id } });
    expect(seatCategory.active).toBe(false);
    expect(seatCategory.description).toBe("販売終了");
    expect(seatCategory.displayOrder).toBe(1);

    const count = await db.seatCategory.count({ where: { eventId: event.id } });
    expect(count).toBe(1);
  });

  it("同一イベント内で新規作成時に名前が重複しているとCONFLICTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "S席",
        description: "",
        active: true,
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });

    await expect(
      upsertSeatCategoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "S席",
          description: "",
          active: true,
          displayOrder: 1,
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const count = await db.seatCategory.count({ where: { eventId: event.id, name: "S席" } });
    expect(count).toBe(1);
  });

  it("更新時に別の席種と同じ名前へ改名しようとするとCONFLICTを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "S席",
        description: "",
        active: true,
        displayOrder: 0,
      },
      context: { session: { user: { id: editor.id } } },
    });
    const aSeat = await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: organizer.id,
        eventId: event.id,
        name: "A席",
        description: "",
        active: true,
        displayOrder: 1,
      },
      context: { session: { user: { id: editor.id } } },
    });

    await expect(
      upsertSeatCategoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          seatCategoryId: aSeat.id,
          name: "S席",
          description: "",
          active: true,
          displayOrder: 1,
        },
        context: { session: { user: { id: editor.id } } },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("他のイベントに属するseatCategoryIdを指定するとNOT_FOUNDを返す", async () => {
    const { organizer, editor, event } = await seedEditorWithEvent();
    const other = await seedEditorWithEvent();
    const otherSeatCategory = await upsertSeatCategoryHandler({
      input: {
        eventOrganizerId: other.organizer.id,
        eventId: other.event.id,
        name: "S席",
        description: "",
        active: true,
        displayOrder: 0,
      },
      context: { session: { user: { id: other.editor.id } } },
    });

    await expect(
      upsertSeatCategoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          seatCategoryId: otherSeatCategory.id,
          name: "改ざん",
          description: "",
          active: true,
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
      upsertSeatCategoryHandler({
        input: {
          eventOrganizerId: organizer.id,
          eventId: event.id,
          name: "S席",
          description: "",
          active: true,
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
