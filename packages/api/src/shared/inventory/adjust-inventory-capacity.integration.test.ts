import { db } from "@ticket-app/db";
import { describe, expect, it } from "vitest";

import { adjustInventoryCapacity } from "./adjust-inventory-capacity";

describe("adjustInventoryCapacity", () => {
  it("在庫が未作成の状態から増加させると、整理番号を1からの連番でInventoryUnitを作成する", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();

    const pool = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 3,
      }),
    );

    expect(pool.capacity).toBe(3);
    const units = await db.inventoryUnit.findMany({
      where: { inventoryPoolId: pool.id },
      orderBy: { entryNumber: "asc" },
    });
    expect(units.map((unit) => unit.entryNumber)).toEqual([1, 2, 3]);
    expect(units.every((unit) => unit.status === "AVAILABLE")).toBe(true);
  });

  it("既存の在庫へ追加すると、整理番号が前回の続きから連番になる", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();
    const firstPool = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 2,
      }),
    );

    const secondPool = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 2,
      }),
    );

    expect(secondPool.id).toBe(firstPool.id);
    expect(secondPool.capacity).toBe(4);
    const units = await db.inventoryUnit.findMany({
      where: { inventoryPoolId: firstPool.id },
      orderBy: { entryNumber: "asc" },
    });
    expect(units.map((unit) => unit.entryNumber)).toEqual([1, 2, 3, 4]);
  });

  it("GENERAL_ADMISSIONで増加させると、entryNumberはnullのまま作成される", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();

    const pool = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "GENERAL_ADMISSION",
        seatAllocationMethod: "NONE",
        capacityDelta: 5,
      }),
    );

    const units = await db.inventoryUnit.findMany({ where: { inventoryPoolId: pool.id } });
    expect(units).toHaveLength(5);
    expect(units.every((unit) => unit.entryNumber === null)).toBe(true);
  });

  it("減少させると、entryNumberの大きい方からAVAILABLEユニットが削除される", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();
    const created = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 5,
      }),
    );

    const decreased = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: -2,
      }),
    );

    expect(decreased.capacity).toBe(3);
    const remaining = await db.inventoryUnit.findMany({
      where: { inventoryPoolId: created.id },
      orderBy: { entryNumber: "asc" },
    });
    expect(remaining.map((unit) => unit.entryNumber)).toEqual([1, 2, 3]);
  });

  it("SOLD状態のユニットは減少対象にせず、AVAILABLEな分だけを削除する", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();
    const created = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 3,
      }),
    );
    const soldUnit = await db.inventoryUnit.findFirstOrThrow({
      where: { inventoryPoolId: created.id, entryNumber: 1 },
    });
    await db.inventoryUnit.update({ where: { id: soldUnit.id }, data: { status: "SOLD" } });

    const decreased = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: -2,
      }),
    );

    expect(decreased.capacity).toBe(1);
    const remaining = await db.inventoryUnit.findMany({ where: { inventoryPoolId: created.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(soldUnit.id);
    expect(remaining[0]?.status).toBe("SOLD");
  });

  it("AVAILABLE数を超える減少要求はBAD_REQUESTになり、既存ユニットは1件も削除されない", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();
    const created = await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 2,
      }),
    );
    const soldUnit = await db.inventoryUnit.findFirstOrThrow({
      where: { inventoryPoolId: created.id, entryNumber: 1 },
    });
    await db.inventoryUnit.update({ where: { id: soldUnit.id }, data: { status: "SOLD" } });

    await expect(
      db.$transaction((tx) =>
        adjustInventoryCapacity(tx, {
          performanceId: performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: -2,
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const remaining = await db.inventoryUnit.count({ where: { inventoryPoolId: created.id } });
    expect(remaining).toBe(2);
  });

  it("RESERVED_SEATを指定すると増加・減少どちらもBAD_REQUESTになる", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();

    await expect(
      db.$transaction((tx) =>
        adjustInventoryCapacity(tx, {
          performanceId: performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "RESERVED_SEAT",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: 1,
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("capacityDeltaが0の場合はBAD_REQUESTになる", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();

    await expect(
      db.$transaction((tx) =>
        adjustInventoryCapacity(tx, {
          performanceId: performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: 0,
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("在庫が未作成の状態で減少させようとするとBAD_REQUESTになる", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();

    await expect(
      db.$transaction((tx) =>
        adjustInventoryCapacity(tx, {
          performanceId: performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacityDelta: -1,
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("既存の在庫と異なるadmissionMethodを指定するとBAD_REQUESTになる", async () => {
    const { performance, seatCategory } = await seedPerformanceAndSeatCategory();
    await db.$transaction((tx) =>
      adjustInventoryCapacity(tx, {
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacityDelta: 1,
      }),
    );

    await expect(
      db.$transaction((tx) =>
        adjustInventoryCapacity(tx, {
          performanceId: performance.id,
          seatCategoryId: seatCategory.id,
          admissionMethod: "GENERAL_ADMISSION",
          seatAllocationMethod: "NONE",
          capacityDelta: 1,
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

async function seedPerformanceAndSeatCategory() {
  const suffix = crypto.randomUUID();
  const company = await db.company.create({ data: { name: `テスト会社 ${suffix}` } });
  const organizer = await db.organizer.create({
    data: { name: `テスト主催者 ${suffix}`, slug: `organizer-${suffix}`, companyId: company.id },
  });
  const event = await db.event.create({
    data: { organizerId: organizer.id, name: `テストイベント ${suffix}`, description: "" },
  });
  const venue = await db.venue.create({ data: { name: `テスト会場 ${suffix}` } });
  const performance = await db.performance.create({
    data: {
      eventId: event.id,
      venueId: venue.id,
      name: "本公演",
      doorsOpenAt: new Date("2026-09-12T08:00:00.000Z"),
      startsAt: new Date("2026-09-12T09:00:00.000Z"),
    },
  });
  const seatCategory = await db.seatCategory.create({
    data: { eventId: event.id, name: "S席", description: "", active: true, displayOrder: 0 },
  });

  return { event, performance, seatCategory };
}
