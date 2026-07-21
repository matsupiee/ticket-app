import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

import { listOrganizerEventsHandler } from "./handler";

const { serverUrl } = inject("apiIntegration");

describe("organizer event list handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/event/list`, {
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

  it("自分が所属する主催者のイベントのみ一覧に含める", async () => {
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
    const otherCompany = await db.company.create({ data: { name: `別会社 ${suffix}` } });
    const otherOrganizer = await db.organizer.create({
      data: {
        name: `別主催者 ${suffix}`,
        slug: `other-organizer-${suffix}`,
        companyId: otherCompany.id,
      },
    });
    await db.event.create({
      data: {
        organizerId: otherOrganizer.id,
        name: `別主催者のイベント ${suffix}`,
        description: "",
      },
    });

    const result = await listOrganizerEventsHandler({
      input: { eventOrganizerId: organizer.id },
      context: { session: { user: { id: editor.id } } },
    });

    expect(result.items.map((item) => item.id)).toEqual([event.id]);
    expect(result.summary.eventCount).toBe(1);
  });

  it("VIEWERロールのユーザーはFORBIDDENになる", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, slug: `organizer-${suffix}`, companyId: company.id },
    });
    const viewer = await db.user.create({
      data: { name: "閲覧者", email: `viewer-${suffix}@example.com` },
    });
    await db.organizerMember.create({
      data: { userId: viewer.id, organizerId: organizer.id, role: "VIEWER" },
    });

    await expect(
      listOrganizerEventsHandler({
        input: { eventOrganizerId: organizer.id },
        context: { session: { user: { id: viewer.id } } },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
