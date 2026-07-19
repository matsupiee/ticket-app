import { describe, expect, it } from "vitest";

import { buildSeedEventScenarios, seedScenarioPatterns } from "./scenarios";

describe("buildSeedEventScenarios", () => {
  it("6パターンそれぞれに整理番号/指定席と先着/抽選の4バリエーションを作る", () => {
    const scenarios = buildSeedEventScenarios();

    expect(scenarios).toHaveLength(seedScenarioPatterns.length * 4);

    for (const pattern of seedScenarioPatterns) {
      const patternScenarios = scenarios.filter(
        (scenario) => scenario.patternCode === pattern.code,
      );

      expect(patternScenarios.map((scenario) => scenario.admissionMethod).sort()).toEqual([
        "NUMBERED_ENTRY",
        "NUMBERED_ENTRY",
        "RESERVED_SEAT",
        "RESERVED_SEAT",
      ]);
      expect(patternScenarios.map((scenario) => scenario.saleMethod).sort()).toEqual([
        "FIRST_COME",
        "FIRST_COME",
        "LOTTERY",
        "LOTTERY",
      ]);
    }
  });

  it("指定席は座席ID、整理番号はentryNumberをInventoryUnitへ入れる", () => {
    const scenarios = buildSeedEventScenarios();
    const reservedScenario = scenarios.find(
      (scenario) => scenario.admissionMethod === "RESERVED_SEAT",
    );
    const numberedScenario = scenarios.find(
      (scenario) => scenario.admissionMethod === "NUMBERED_ENTRY",
    );

    expect(reservedScenario).toBeDefined();
    expect(numberedScenario).toBeDefined();
    expect(reservedScenario?.inventoryUnits.every((unit) => unit.seatId && !unit.entryNumber)).toBe(
      true,
    );
    expect(numberedScenario?.inventoryUnits.every((unit) => !unit.seatId && unit.entryNumber)).toBe(
      true,
    );
  });

  it("通し券パターンは単日券と3公演ぶんのentitlementを持つ通し券を作る", () => {
    const scenarios = buildSeedEventScenarios();
    const scenario = scenarios.find(
      (seedScenario) =>
        seedScenario.patternCode === "p3-pass-r1" &&
        seedScenario.admissionMethod === "NUMBERED_ENTRY" &&
        seedScenario.saleMethod === "FIRST_COME",
    );

    expect(scenario).toBeDefined();
    expect(scenario?.performances).toHaveLength(3);

    const passOffer = scenario?.saleOffers.find((saleOffer) => saleOffer.kind === "PASS");
    expect(passOffer).toBeDefined();
    expect(
      scenario?.saleOffers.filter((saleOffer) => saleOffer.kind === "SINGLE_PERFORMANCE"),
    ).toHaveLength(3);
    expect(
      scenario?.saleOfferEntitlements.filter(
        (entitlement) => entitlement.saleOfferId === passOffer?.id,
      ),
    ).toHaveLength(3);
  });

  it("20公演2受付5席種2料金種別パターンは受付・公演・席種・料金の組み合わせを全部作る", () => {
    const scenarios = buildSeedEventScenarios();
    const scenario = scenarios.find(
      (seedScenario) =>
        seedScenario.patternCode === "p20-w2-s5-r2" &&
        seedScenario.admissionMethod === "RESERVED_SEAT" &&
        seedScenario.saleMethod === "LOTTERY",
    );

    expect(scenario).toBeDefined();
    expect(scenario?.performances).toHaveLength(20);
    expect(scenario?.saleWindows).toHaveLength(2);
    expect(scenario?.seatCategories).toHaveLength(5);
    expect(scenario?.rateTypes).toHaveLength(2);
    expect(scenario?.saleOffers).toHaveLength(2 * 20 * 5);
    expect(scenario?.saleOfferRates).toHaveLength(2 * 20 * 5 * 2);
  });
});
