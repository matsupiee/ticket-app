import { describe, expect, it } from "vitest";

import {
  filterPlatformOrganizers,
  getPlatformOrganizerById,
  platformMonthlySales,
  platformOrganizers,
  summarizePlatformSales,
} from "./platform";

describe("platform admin domain", () => {
  it("月別売上から総流通額、平台手数料、精算額を集計する", () => {
    const summary = summarizePlatformSales(platformMonthlySales);

    expect(summary.grossSales).toBe(13_971_600);
    expect(summary.platformFeeAmount).toBe(679_308);
    expect(summary.payoutAmount).toBe(13_292_292);
    expect(summary.applications).toBe(1_230);
  });

  it("主催者名、ステータス、地域で絞り込める", () => {
    expect(filterPlatformOrganizers("審査").map((organizer) => organizer.id)).toEqual([
      "bay-side-committee",
    ]);
    expect(filterPlatformOrganizers("京都").map((organizer) => organizer.id)).toEqual([
      "kyoto-arts",
    ]);
    expect(filterPlatformOrganizers("").map((organizer) => organizer.id)).toEqual(
      platformOrganizers.map((organizer) => organizer.id),
    );
  });

  it("主催者詳細でイベントと精算リスクを確認できる", () => {
    const organizer = getPlatformOrganizerById("orbit-works");

    expect(organizer?.events).toHaveLength(2);
    expect(organizer?.riskLevel).toBe("LOW");
  });
});
