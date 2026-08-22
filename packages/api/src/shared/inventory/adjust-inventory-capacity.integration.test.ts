import { db } from "@ticket-app/db";
import { describe, expect, it } from "vitest";

import { adjustInventoryCapacity } from "./adjust-inventory-capacity";

describe("adjustInventoryCapacity", () => {
  it("在庫が未作成の状態で枚数を指定すると、その枚数の在庫枠を作る", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `テスト会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "本公演",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });
    const inventoryCategory = await db.inventoryCategory.create({
      data: {
        eventId: event.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
      },
    });

    const pool = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 3,
      }),
    );

    expect(pool.capacity).toBe(3);
    const slots = await db.inventorySlot.findMany({ where: { inventoryPoolId: pool.id } });
    expect(slots).toHaveLength(3);
    // 整理番号は注文への割り当て時に採番するので、作成時点では未採番のままにする（ADR 0005）
    expect(slots.every((slot) => slot.entryNumber === null)).toBe(true);
    expect(slots.every((slot) => slot.status === "AVAILABLE")).toBe(true);
    expect(pool.nextEntryNumber).toBe(1);
  });

  it("既存の在庫より多い枚数を指定すると、差分だけ在庫枠を追加する", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `テスト会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "本公演",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });
    const inventoryCategory = await db.inventoryCategory.create({
      data: {
        eventId: event.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
      },
    });
    const pool = await db.inventoryPool.create({
      data: {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 2,
        inventorySlots: { createMany: { data: [{}, {}] } },
      },
    });
    const slotIdsBefore = (
      await db.inventorySlot.findMany({ where: { inventoryPoolId: pool.id } })
    ).map((slot) => slot.id);

    const updated = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 5,
      }),
    );

    expect(updated.capacity).toBe(5);
    const slots = await db.inventorySlot.findMany({ where: { inventoryPoolId: pool.id } });
    expect(slots).toHaveLength(5);
    // 既存の枠は作り直さない
    expect(slots.map((slot) => slot.id)).toEqual(expect.arrayContaining(slotIdsBefore));
  });

  it("枚数を減らすと、販売可能な枠だけを削除し確保中の枠は残す", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `テスト会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "本公演",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });
    const inventoryCategory = await db.inventoryCategory.create({
      data: {
        eventId: event.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
      },
    });
    const pool = await db.inventoryPool.create({
      data: {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 4,
        inventorySlots: { createMany: { data: [{}, {}, {}, {}] } },
      },
    });
    const [heldSlot] = await db.inventorySlot.findMany({
      where: { inventoryPoolId: pool.id },
      orderBy: { createdAt: "asc" },
      take: 1,
    });
    await db.inventorySlot.update({
      where: { id: heldSlot?.id ?? "" },
      data: { status: "HELD" },
    });

    const updated = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 1,
      }),
    );

    expect(updated.capacity).toBe(1);
    const slots = await db.inventorySlot.findMany({ where: { inventoryPoolId: pool.id } });
    expect(slots).toHaveLength(1);
    expect(slots[0]?.id).toBe(heldSlot?.id);
    expect(slots[0]?.status).toBe("HELD");
  });

  it("販売可能な枠より多く減らそうとするとBAD_REQUESTになり、1件も削除されない", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `テスト会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "本公演",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });
    const inventoryCategory = await db.inventoryCategory.create({
      data: {
        eventId: event.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
      },
    });
    const pool = await db.inventoryPool.create({
      data: {
        stageId: stage.id,
        inventoryCategoryId: inventoryCategory.id,
        capacity: 3,
        inventorySlots: { createMany: { data: [{}, {}, {}] } },
      },
    });
    await db.inventorySlot.updateMany({
      where: { inventoryPoolId: pool.id },
      data: { status: "HELD" },
    });

    await expect(
      db.$transaction((tx) =>
        adjustInventoryCapacity(tx, {
          stageId: stage.id,
          inventoryCategoryId: inventoryCategory.id,
          capacity: 0,
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const slots = await db.inventorySlot.findMany({ where: { inventoryPoolId: pool.id } });
    expect(slots).toHaveLength(3);
    const unchangedPool = await db.inventoryPool.findUniqueOrThrow({ where: { id: pool.id } });
    expect(unchangedPool.capacity).toBe(3);
  });

  it("負の枚数を指定するとBAD_REQUESTになる", async () => {
    const suffix = crypto.randomUUID();
    const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
    const organizer = await db.organizer.create({
      data: { name: `テスト主催者 ${suffix}`, companyId: company.id },
    });
    const event = await db.event.create({
      data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
    });
    const venue = await db.venue.create({ data: { name: `テスト会場 ${suffix}` } });
    const stage = await db.stage.create({
      data: {
        eventId: event.id,
        venueId: venue.id,
        name: "本公演",
        doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
        startsAt: new Date("2026-09-12T09:00:00.000Z"),
      },
    });
    const inventoryCategory = await db.inventoryCategory.create({
      data: {
        eventId: event.id,
        kind: "ENTRY_NUMBER",
        name: "S席",
        description: "",
        displayOrder: 0,
      },
    });

    await expect(
      db.$transaction((tx) =>
        adjustInventoryCapacity(tx, {
          stageId: stage.id,
          inventoryCategoryId: inventoryCategory.id,
          capacity: -1,
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
