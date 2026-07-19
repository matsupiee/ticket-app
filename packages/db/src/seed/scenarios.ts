export type SeedSaleMethod = "FIRST_COME" | "LOTTERY";

export type SeedAdmissionMethod = "NUMBERED_ENTRY" | "RESERVED_SEAT";

export type SeedSeatAllocationMethod = "LOTTERY_LATER" | "IMMEDIATE";

export type SeedScenarioPattern = {
  code: string;
  label: string;
  performanceCount: number;
  saleWindowCount: number;
  seatCategoryCount: number;
  rateTypeCount: number;
  includesPassOffer: boolean;
  inventoryUnitsPerPool: number;
};

export type SeedScenarioVariant = {
  code: string;
  label: string;
};

export type SeedPerformance = {
  id: string;
  venueId: string;
  seatLayoutId: string | null;
  name: string;
  doorsOpenAt: Date;
  startsAt: Date;
};

export type SeedSeatCategory = {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
};

export type SeedRateType = {
  id: string;
  name: string;
  displayOrder: number;
};

export type SeedSaleWindow = {
  id: string;
  name: string;
  publishesAt: Date;
  applicationStartsAt: Date;
  applicationEndsAt: Date;
  method: SeedSaleMethod;
  notifyLotteryResultAt: Date | null;
};

export type SeedInventoryPool = {
  id: string;
  performanceId: string;
  seatCategoryId: string;
  admissionMethod: SeedAdmissionMethod;
  seatAllocationMethod: SeedSeatAllocationMethod;
  capacity: number;
};

export type SeedInventoryUnit = {
  id: string;
  inventoryPoolId: string;
  performanceId: string;
  seatId: string | null;
  entryNumber: number | null;
};

export type SeedSeatLayout = {
  id: string;
  venueId: string;
  name: string;
};

export type SeedSeat = {
  id: string;
  seatLayoutId: string;
  rowLabel: string;
  seatLabel: string;
};

export type SeedSaleOffer = {
  id: string;
  saleWindowId: string;
  name: string;
  description: string;
  maxQuantityPerOrder: number;
  displayOrder: number;
  seatCategoryId: string;
  performanceIds: string[];
  kind: "SINGLE_PERFORMANCE" | "PASS";
};

export type SeedSaleOfferRate = {
  id: string;
  saleOfferId: string;
  rateTypeId: string;
  price: number;
  displayOrder: number;
};

export type SeedSaleOfferEntitlement = {
  id: string;
  saleOfferId: string;
  inventoryPoolId: string;
  performanceId: string;
};

export type SeedEventScenario = {
  slug: string;
  patternCode: string;
  admissionMethod: SeedAdmissionMethod;
  seatAllocationMethod: SeedSeatAllocationMethod;
  saleMethod: SeedSaleMethod;
  event: {
    id: string;
    name: string;
    description: string;
  };
  venue: {
    id: string;
    name: string;
  };
  seatLayout: SeedSeatLayout | null;
  seats: SeedSeat[];
  performances: SeedPerformance[];
  seatCategories: SeedSeatCategory[];
  rateTypes: SeedRateType[];
  saleWindows: SeedSaleWindow[];
  inventoryPools: SeedInventoryPool[];
  inventoryUnits: SeedInventoryUnit[];
  saleOffers: SeedSaleOffer[];
  saleOfferRates: SeedSaleOfferRate[];
  saleOfferEntitlements: SeedSaleOfferEntitlement[];
};

export const seedOrganizerUser = {
  id: "seed-organizer-admin",
  name: "Seed Organizer Admin",
  email: "seed-organizer@example.com",
};

export const seedCompany = {
  id: "seed-ticket-company",
  name: "Seed Ticket Company",
};

export const seedOrganizer = {
  id: "seed-ticket-organizer",
  name: "Seed Ticket Organizer",
  slug: "seed-ticket-organizer",
  inquiryEmail: "seed-organizer@example.com",
  inquiryPhoneNumber: "0312345678",
};

export const seedScenarioPatterns = [
  {
    code: "p1-w1-s1-r1",
    label: "1公演1受付1席種1料金種別",
    performanceCount: 1,
    saleWindowCount: 1,
    seatCategoryCount: 1,
    rateTypeCount: 1,
    includesPassOffer: false,
    inventoryUnitsPerPool: 16,
  },
  {
    code: "p1-w1-s1-r2",
    label: "1公演1受付1席種2料金種別",
    performanceCount: 1,
    saleWindowCount: 1,
    seatCategoryCount: 1,
    rateTypeCount: 2,
    includesPassOffer: false,
    inventoryUnitsPerPool: 16,
  },
  {
    code: "p1-w2-s2-r1",
    label: "1公演2受付2席種1料金種別",
    performanceCount: 1,
    saleWindowCount: 2,
    seatCategoryCount: 2,
    rateTypeCount: 1,
    includesPassOffer: false,
    inventoryUnitsPerPool: 16,
  },
  {
    code: "p3-pass-r1",
    label: "3公演 通し券あり1料金種別",
    performanceCount: 3,
    saleWindowCount: 1,
    seatCategoryCount: 1,
    rateTypeCount: 1,
    includesPassOffer: true,
    inventoryUnitsPerPool: 16,
  },
  {
    code: "p20-w2-s5-r1",
    label: "20公演2受付5席種1料金種別",
    performanceCount: 20,
    saleWindowCount: 2,
    seatCategoryCount: 5,
    rateTypeCount: 1,
    includesPassOffer: false,
    inventoryUnitsPerPool: 16,
  },
  {
    code: "p20-w2-s5-r2",
    label: "20公演2受付5席種2料金種別",
    performanceCount: 20,
    saleWindowCount: 2,
    seatCategoryCount: 5,
    rateTypeCount: 2,
    includesPassOffer: false,
    inventoryUnitsPerPool: 16,
  },
] as const satisfies SeedScenarioPattern[];

export const seedAdmissionVariants = [
  {
    code: "numbered",
    label: "整理番号",
    admissionMethod: "NUMBERED_ENTRY",
  },
  {
    code: "reserved",
    label: "指定席",
    admissionMethod: "RESERVED_SEAT",
  },
] as const;

export const seedSaleMethodVariants = [
  {
    code: "first",
    label: "先着",
    saleMethod: "FIRST_COME",
  },
  {
    code: "lottery",
    label: "抽選",
    saleMethod: "LOTTERY",
  },
] as const;

const rateTypeNames = ["一般", "U-22"];
const oneSeatCategoryNames = ["一般席"];
const twoSeatCategoryNames = ["S席", "A席"];
const fiveSeatCategoryNames = ["VIP席", "S席", "A席", "B席", "後方席"];

export function buildSeedEventScenarios() {
  let scenarioIndex = 0;
  const scenarios: SeedEventScenario[] = [];

  for (const pattern of seedScenarioPatterns) {
    for (const admissionVariant of seedAdmissionVariants) {
      for (const saleMethodVariant of seedSaleMethodVariants) {
        scenarios.push(
          buildSeedEventScenario({
            pattern,
            admissionCode: admissionVariant.code,
            admissionLabel: admissionVariant.label,
            admissionMethod: admissionVariant.admissionMethod,
            saleMethodCode: saleMethodVariant.code,
            saleMethodLabel: saleMethodVariant.label,
            saleMethod: saleMethodVariant.saleMethod,
            scenarioIndex,
          }),
        );
        scenarioIndex += 1;
      }
    }
  }

  return scenarios;
}

function buildSeedEventScenario(input: {
  pattern: SeedScenarioPattern;
  admissionCode: string;
  admissionLabel: string;
  admissionMethod: SeedAdmissionMethod;
  saleMethodCode: string;
  saleMethodLabel: string;
  saleMethod: SeedSaleMethod;
  scenarioIndex: number;
}): SeedEventScenario {
  const {
    pattern,
    admissionCode,
    admissionLabel,
    admissionMethod,
    saleMethodCode,
    saleMethodLabel,
    saleMethod,
    scenarioIndex,
  } = input;
  const slug = `seed-${pattern.code}-${admissionCode}-${saleMethodCode}`;
  const venue = {
    id: `${slug}-venue`,
    name: `Seed Hall ${scenarioIndex + 1}`,
  };
  const seatAllocationMethod = getSeatAllocationMethod(saleMethod);
  const seatLayout =
    admissionMethod === "RESERVED_SEAT"
      ? {
          id: `${slug}-layout`,
          venueId: venue.id,
          name: "Seed reserved seat layout",
        }
      : null;
  const seatCategories = buildSeatCategories(slug, pattern.seatCategoryCount);
  const rateTypes = buildRateTypes(slug, pattern.rateTypeCount);
  const performances = buildPerformances({
    slug,
    venueId: venue.id,
    seatLayoutId: seatLayout?.id ?? null,
    performanceCount: pattern.performanceCount,
    scenarioIndex,
  });
  const seats = seatLayout
    ? buildSeats({
        slug,
        seatLayoutId: seatLayout.id,
        seatCategoryCount: pattern.seatCategoryCount,
        inventoryUnitsPerPool: pattern.inventoryUnitsPerPool,
      })
    : [];
  const inventoryPools = buildInventoryPools({
    slug,
    performances,
    seatCategories,
    admissionMethod,
    seatAllocationMethod,
    capacity: pattern.inventoryUnitsPerPool,
  });
  const inventoryUnits = buildInventoryUnits({
    admissionMethod,
    inventoryPools,
    seats,
    seatCategoryCount: pattern.seatCategoryCount,
    inventoryUnitsPerPool: pattern.inventoryUnitsPerPool,
  });
  const saleWindows = buildSaleWindows({
    slug,
    saleWindowCount: pattern.saleWindowCount,
    saleMethod,
    saleMethodLabel,
    scenarioIndex,
  });
  const saleOffers = buildSaleOffers({
    slug,
    saleWindows,
    performances,
    seatCategories,
    includesPassOffer: pattern.includesPassOffer,
  });
  const saleOfferRates = buildSaleOfferRates({
    saleOffers,
    rateTypes,
    performances,
  });
  const saleOfferEntitlements = buildSaleOfferEntitlements({
    saleOffers,
    inventoryPools,
  });

  return {
    slug,
    patternCode: pattern.code,
    admissionMethod,
    seatAllocationMethod,
    saleMethod,
    event: {
      id: slug,
      name: `[Seed] ${pattern.label} / ${admissionLabel} / ${saleMethodLabel}`,
      description: `${pattern.label}を確認するためのseedイベント。${admissionLabel}方式、${saleMethodLabel}受付。`,
    },
    venue,
    seatLayout,
    seats,
    performances,
    seatCategories,
    rateTypes,
    saleWindows,
    inventoryPools,
    inventoryUnits,
    saleOffers,
    saleOfferRates,
    saleOfferEntitlements,
  };
}

function getSeatAllocationMethod(saleMethod: SeedSaleMethod): SeedSeatAllocationMethod {
  return saleMethod === "LOTTERY" ? "LOTTERY_LATER" : "IMMEDIATE";
}

function buildSeatCategories(slug: string, count: number) {
  const names = getSeatCategoryNames(count);

  return names.map((name, index) => ({
    id: `${slug}-seat-category-${index + 1}`,
    name,
    description: `${name}のseed席種`,
    displayOrder: index,
  }));
}

function getSeatCategoryNames(count: number) {
  if (count === 1) {
    return oneSeatCategoryNames;
  }

  if (count === 2) {
    return twoSeatCategoryNames;
  }

  return fiveSeatCategoryNames.slice(0, count);
}

function buildRateTypes(slug: string, count: number) {
  return rateTypeNames.slice(0, count).map((name, index) => ({
    id: `${slug}-rate-type-${index + 1}`,
    name,
    displayOrder: index,
  }));
}

function buildPerformances(input: {
  slug: string;
  venueId: string;
  seatLayoutId: string | null;
  performanceCount: number;
  scenarioIndex: number;
}) {
  const { slug, venueId, seatLayoutId, performanceCount, scenarioIndex } = input;
  const scenarioDayOffset = scenarioIndex * 35;

  return Array.from({ length: performanceCount }, (_, index) => {
    const startsAt = dateFromSeedDay(scenarioDayOffset + index, 18, 0);

    return {
      id: `${slug}-performance-${index + 1}`,
      venueId,
      seatLayoutId,
      name: performanceCount === 1 ? "本公演" : `公演 ${index + 1}`,
      doorsOpenAt: addHours(startsAt, -1),
      startsAt,
    };
  });
}

function buildSeats(input: {
  slug: string;
  seatLayoutId: string;
  seatCategoryCount: number;
  inventoryUnitsPerPool: number;
}) {
  const { slug, seatLayoutId, seatCategoryCount, inventoryUnitsPerPool } = input;
  const seats: SeedSeat[] = [];

  for (let seatCategoryIndex = 0; seatCategoryIndex < seatCategoryCount; seatCategoryIndex += 1) {
    for (let unitIndex = 0; unitIndex < inventoryUnitsPerPool; unitIndex += 1) {
      seats.push({
        id: getSeatId(slug, seatCategoryIndex, unitIndex),
        seatLayoutId,
        rowLabel: `${seatCategoryIndex + 1}列`,
        seatLabel: `${unitIndex + 1}番`,
      });
    }
  }

  return seats;
}

function buildInventoryPools(input: {
  slug: string;
  performances: SeedPerformance[];
  seatCategories: SeedSeatCategory[];
  admissionMethod: SeedAdmissionMethod;
  seatAllocationMethod: SeedSeatAllocationMethod;
  capacity: number;
}) {
  const { slug, performances, seatCategories, admissionMethod, seatAllocationMethod, capacity } =
    input;
  const inventoryPools: SeedInventoryPool[] = [];

  for (const [performanceIndex, performance] of performances.entries()) {
    for (const [seatCategoryIndex, seatCategory] of seatCategories.entries()) {
      inventoryPools.push({
        id: getInventoryPoolId(slug, performanceIndex, seatCategoryIndex),
        performanceId: performance.id,
        seatCategoryId: seatCategory.id,
        admissionMethod,
        seatAllocationMethod,
        capacity,
      });
    }
  }

  return inventoryPools;
}

function buildInventoryUnits(input: {
  admissionMethod: SeedAdmissionMethod;
  inventoryPools: SeedInventoryPool[];
  seats: SeedSeat[];
  seatCategoryCount: number;
  inventoryUnitsPerPool: number;
}) {
  const { admissionMethod, inventoryPools, seats, seatCategoryCount, inventoryUnitsPerPool } =
    input;

  return inventoryPools.flatMap((pool, poolIndex) => {
    const seatCategoryIndex = poolIndex % seatCategoryCount;

    return Array.from({ length: inventoryUnitsPerPool }, (_, unitIndex) => {
      const seat = seats[seatCategoryIndex * inventoryUnitsPerPool + unitIndex];

      return {
        id: `${pool.id}-unit-${unitIndex + 1}`,
        inventoryPoolId: pool.id,
        performanceId: pool.performanceId,
        seatId: admissionMethod === "RESERVED_SEAT" ? (seat?.id ?? null) : null,
        entryNumber: admissionMethod === "NUMBERED_ENTRY" ? unitIndex + 1 : null,
      };
    });
  });
}

function buildSaleWindows(input: {
  slug: string;
  saleWindowCount: number;
  saleMethod: SeedSaleMethod;
  saleMethodLabel: string;
  scenarioIndex: number;
}) {
  const { slug, saleWindowCount, saleMethod, saleMethodLabel, scenarioIndex } = input;
  const scenarioDayOffset = scenarioIndex * 35;

  return Array.from({ length: saleWindowCount }, (_, index) => {
    const applicationStartsAt = dateFromSeedDay(scenarioDayOffset - 45 + index * 14, 10, 0);
    const applicationEndsAt = dateFromSeedDay(scenarioDayOffset - 35 + index * 14, 23, 59);

    return {
      id: `${slug}-sale-window-${index + 1}`,
      name:
        saleWindowCount === 1 ? `${saleMethodLabel}受付` : `${index + 1}次${saleMethodLabel}受付`,
      publishesAt: addDays(applicationStartsAt, -7),
      applicationStartsAt,
      applicationEndsAt,
      method: saleMethod,
      notifyLotteryResultAt:
        saleMethod === "LOTTERY"
          ? dateFromSeedDay(scenarioDayOffset - 31 + index * 14, 18, 0)
          : null,
    };
  });
}

function buildSaleOffers(input: {
  slug: string;
  saleWindows: SeedSaleWindow[];
  performances: SeedPerformance[];
  seatCategories: SeedSeatCategory[];
  includesPassOffer: boolean;
}) {
  const { slug, saleWindows, performances, seatCategories, includesPassOffer } = input;
  const saleOffers: SeedSaleOffer[] = [];

  for (const [saleWindowIndex, saleWindow] of saleWindows.entries()) {
    for (const [seatCategoryIndex, seatCategory] of seatCategories.entries()) {
      for (const [performanceIndex, performance] of performances.entries()) {
        saleOffers.push({
          id: `${slug}-offer-w${saleWindowIndex + 1}-p${performanceIndex + 1}-s${seatCategoryIndex + 1}`,
          saleWindowId: saleWindow.id,
          name:
            performances.length === 1
              ? seatCategory.name
              : `${performance.name} ${seatCategory.name}`,
          description: `${performance.name}の${seatCategory.name}`,
          maxQuantityPerOrder: 4,
          displayOrder: saleOffers.length,
          seatCategoryId: seatCategory.id,
          performanceIds: [performance.id],
          kind: "SINGLE_PERFORMANCE",
        });
      }

      if (includesPassOffer) {
        saleOffers.push({
          id: `${slug}-offer-w${saleWindowIndex + 1}-pass-s${seatCategoryIndex + 1}`,
          saleWindowId: saleWindow.id,
          name: `${performances.length}公演通し券 ${seatCategory.name}`,
          description: `${performances.length}公演すべてに入場できる${seatCategory.name}の通し券`,
          maxQuantityPerOrder: 2,
          displayOrder: saleOffers.length,
          seatCategoryId: seatCategory.id,
          performanceIds: performances.map((performance) => performance.id),
          kind: "PASS",
        });
      }
    }
  }

  return saleOffers;
}

function buildSaleOfferRates(input: {
  saleOffers: SeedSaleOffer[];
  rateTypes: SeedRateType[];
  performances: SeedPerformance[];
}) {
  const { saleOffers, rateTypes, performances } = input;

  return saleOffers.flatMap((saleOffer) =>
    rateTypes.map((rateType, rateTypeIndex) => {
      const seatCategoryIndex = Number(saleOffer.seatCategoryId.split("-").at(-1) ?? "1") - 1;
      const singlePerformancePrice = calculateSinglePerformancePrice(
        seatCategoryIndex,
        rateTypeIndex,
      );
      const price =
        saleOffer.kind === "PASS"
          ? calculatePassPrice(singlePerformancePrice, performances.length)
          : singlePerformancePrice;

      return {
        id: `${saleOffer.id}-rate-${rateTypeIndex + 1}`,
        saleOfferId: saleOffer.id,
        rateTypeId: rateType.id,
        price,
        displayOrder: rateType.displayOrder,
      };
    }),
  );
}

function calculateSinglePerformancePrice(seatCategoryIndex: number, rateTypeIndex: number) {
  const basePrice = 5_000 + seatCategoryIndex * 1_500;

  if (rateTypeIndex === 0) {
    return basePrice;
  }

  return Math.max(1_000, basePrice - 1_500);
}

function calculatePassPrice(singlePerformancePrice: number, performanceCount: number) {
  return Math.floor((singlePerformancePrice * performanceCount * 0.9) / 100) * 100;
}

function buildSaleOfferEntitlements(input: {
  saleOffers: SeedSaleOffer[];
  inventoryPools: SeedInventoryPool[];
}) {
  const { saleOffers, inventoryPools } = input;

  return saleOffers.flatMap((saleOffer) =>
    saleOffer.performanceIds.map((performanceId) => {
      const inventoryPool = inventoryPools.find(
        (pool) =>
          pool.performanceId === performanceId && pool.seatCategoryId === saleOffer.seatCategoryId,
      );

      if (!inventoryPool) {
        throw new Error(`inventoryPoolが見つかりません: ${saleOffer.id} ${performanceId}`);
      }

      return {
        id: `${saleOffer.id}-entitlement-${performanceId}`,
        saleOfferId: saleOffer.id,
        inventoryPoolId: inventoryPool.id,
        performanceId,
      };
    }),
  );
}

function getInventoryPoolId(slug: string, performanceIndex: number, seatCategoryIndex: number) {
  return `${slug}-pool-p${performanceIndex + 1}-s${seatCategoryIndex + 1}`;
}

function getSeatId(slug: string, seatCategoryIndex: number, unitIndex: number) {
  return `${slug}-seat-s${seatCategoryIndex + 1}-${unitIndex + 1}`;
}

function dateFromSeedDay(dayOffset: number, hour: number, minute: number) {
  return new Date(Date.UTC(2026, 8, 15 + dayOffset, hour, minute));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
