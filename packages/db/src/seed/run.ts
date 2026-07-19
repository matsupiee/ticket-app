import { db } from "../index";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import {
  buildSeedEventScenarios,
  seedCompany,
  seedOrganizer,
  seedOrganizerUser,
  type SeedEventScenario,
} from "./scenarios";

type SeedClient = Prisma.TransactionClient;

type SeedDatabaseOptions = {
  reset?: boolean;
};

type SeedDatabaseResult = {
  eventCount: number;
  performanceCount: number;
  saleWindowCount: number;
  saleOfferCount: number;
  inventoryUnitCount: number;
};

export async function seedDatabase(
  client: PrismaClient,
  options: SeedDatabaseOptions = {},
): Promise<SeedDatabaseResult> {
  const scenarios = buildSeedEventScenarios();

  return await client.$transaction(async (tx) => {
    if (options.reset ?? true) {
      await deleteSeedData(tx, scenarios);
    }

    await upsertSeedOwner(tx);
    await createSeedScenarios(tx, scenarios);

    return {
      eventCount: scenarios.length,
      performanceCount: scenarios.reduce(
        (total, scenario) => total + scenario.performances.length,
        0,
      ),
      saleWindowCount: scenarios.reduce(
        (total, scenario) => total + scenario.saleWindows.length,
        0,
      ),
      saleOfferCount: scenarios.reduce((total, scenario) => total + scenario.saleOffers.length, 0),
      inventoryUnitCount: scenarios.reduce(
        (total, scenario) => total + scenario.inventoryUnits.length,
        0,
      ),
    };
  });
}

async function upsertSeedOwner(tx: SeedClient) {
  await tx.user.upsert({
    where: {
      id: seedOrganizerUser.id,
    },
    update: {
      name: seedOrganizerUser.name,
      email: seedOrganizerUser.email,
      emailVerified: true,
    },
    create: {
      id: seedOrganizerUser.id,
      name: seedOrganizerUser.name,
      email: seedOrganizerUser.email,
      emailVerified: true,
    },
  });

  await tx.company.upsert({
    where: {
      id: seedCompany.id,
    },
    update: {
      name: seedCompany.name,
    },
    create: {
      id: seedCompany.id,
      name: seedCompany.name,
    },
  });

  await tx.organizer.upsert({
    where: {
      id: seedOrganizer.id,
    },
    update: {
      name: seedOrganizer.name,
      slug: seedOrganizer.slug,
      companyId: seedCompany.id,
      inquiryEmail: seedOrganizer.inquiryEmail,
      inquiryPhoneNumber: seedOrganizer.inquiryPhoneNumber,
    },
    create: {
      id: seedOrganizer.id,
      name: seedOrganizer.name,
      slug: seedOrganizer.slug,
      companyId: seedCompany.id,
      inquiryEmail: seedOrganizer.inquiryEmail,
      inquiryPhoneNumber: seedOrganizer.inquiryPhoneNumber,
    },
  });

  await tx.organizerMember.upsert({
    where: {
      userId_organizerId: {
        userId: seedOrganizerUser.id,
        organizerId: seedOrganizer.id,
      },
    },
    update: {
      role: "EDITOR",
    },
    create: {
      id: "seed-organizer-admin-member",
      userId: seedOrganizerUser.id,
      organizerId: seedOrganizer.id,
      role: "EDITOR",
    },
  });
}

async function createSeedScenarios(tx: SeedClient, scenarios: SeedEventScenario[]) {
  await tx.venue.createMany({
    data: scenarios.map((scenario) => scenario.venue),
    skipDuplicates: true,
  });

  await tx.seatLayout.createMany({
    data: scenarios.flatMap((scenario) => (scenario.seatLayout ? [scenario.seatLayout] : [])),
    skipDuplicates: true,
  });

  await tx.seat.createMany({
    data: scenarios.flatMap((scenario) => scenario.seats),
    skipDuplicates: true,
  });

  await tx.event.createMany({
    data: scenarios.map((scenario) => ({
      id: scenario.event.id,
      organizerId: seedOrganizer.id,
      name: scenario.event.name,
      description: scenario.event.description,
    })),
    skipDuplicates: true,
  });

  await tx.performance.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.performances.map((performance) => ({
        id: performance.id,
        eventId: scenario.event.id,
        venueId: performance.venueId,
        seatLayoutId: performance.seatLayoutId,
        name: performance.name,
        doorsOpenAt: performance.doorsOpenAt,
        startsAt: performance.startsAt,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.seatCategory.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.seatCategories.map((seatCategory) => ({
        id: seatCategory.id,
        eventId: scenario.event.id,
        name: seatCategory.name,
        description: seatCategory.description,
        displayOrder: seatCategory.displayOrder,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.rateType.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.rateTypes.map((rateType) => ({
        id: rateType.id,
        eventId: scenario.event.id,
        name: rateType.name,
        displayOrder: rateType.displayOrder,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.saleWindow.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.saleWindows.map((saleWindow) => ({
        id: saleWindow.id,
        eventId: scenario.event.id,
        name: saleWindow.name,
        publishesAt: saleWindow.publishesAt,
        applicationStartsAt: saleWindow.applicationStartsAt,
        applicationEndsAt: saleWindow.applicationEndsAt,
        isSmsAuthRequired: saleWindow.method === "LOTTERY",
        method: saleWindow.method,
        lotteryMode: "AUTO",
        notifyLotteryResultAt: saleWindow.notifyLotteryResultAt,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.inventoryPool.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.inventoryPools.map((inventoryPool) => ({
        id: inventoryPool.id,
        performanceId: inventoryPool.performanceId,
        seatCategoryId: inventoryPool.seatCategoryId,
        admissionMethod: inventoryPool.admissionMethod,
        seatAllocationMethod: inventoryPool.seatAllocationMethod,
        capacity: inventoryPool.capacity,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.inventoryUnit.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.inventoryUnits.map((inventoryUnit) => ({
        id: inventoryUnit.id,
        inventoryPoolId: inventoryUnit.inventoryPoolId,
        seatId: inventoryUnit.seatId,
        entryNumber: inventoryUnit.entryNumber,
        performanceId: inventoryUnit.performanceId,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.saleOffer.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.saleOffers.map((saleOffer) => ({
        id: saleOffer.id,
        saleWindowId: saleOffer.saleWindowId,
        name: saleOffer.name,
        description: saleOffer.description,
        maxQuantityPerOrder: saleOffer.maxQuantityPerOrder,
        displayOrder: saleOffer.displayOrder,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.saleOfferRate.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.saleOfferRates.map((saleOfferRate) => ({
        id: saleOfferRate.id,
        saleOfferId: saleOfferRate.saleOfferId,
        rateTypeId: saleOfferRate.rateTypeId,
        price: saleOfferRate.price,
        displayOrder: saleOfferRate.displayOrder,
      })),
    ),
    skipDuplicates: true,
  });

  await tx.saleOfferEntitlement.createMany({
    data: scenarios.flatMap((scenario) =>
      scenario.saleOfferEntitlements.map((saleOfferEntitlement) => ({
        id: saleOfferEntitlement.id,
        saleOfferId: saleOfferEntitlement.saleOfferId,
        inventoryPoolId: saleOfferEntitlement.inventoryPoolId,
        performanceId: saleOfferEntitlement.performanceId,
      })),
    ),
    skipDuplicates: true,
  });
}

async function deleteSeedData(tx: SeedClient, scenarios: SeedEventScenario[]) {
  const ids = collectSeedIds(scenarios);

  await tx.saleOfferEntitlement.deleteMany({
    where: {
      id: {
        in: ids.saleOfferEntitlementIds,
      },
    },
  });
  await tx.saleOfferRate.deleteMany({
    where: {
      id: {
        in: ids.saleOfferRateIds,
      },
    },
  });
  await tx.feeRule.deleteMany({
    where: {
      eventId: {
        in: ids.eventIds,
      },
    },
  });
  await tx.saleOffer.deleteMany({
    where: {
      id: {
        in: ids.saleOfferIds,
      },
    },
  });
  await tx.saleWindow.deleteMany({
    where: {
      id: {
        in: ids.saleWindowIds,
      },
    },
  });
  await tx.inventoryUnit.deleteMany({
    where: {
      id: {
        in: ids.inventoryUnitIds,
      },
    },
  });
  await tx.inventoryPool.deleteMany({
    where: {
      id: {
        in: ids.inventoryPoolIds,
      },
    },
  });
  await tx.rateType.deleteMany({
    where: {
      id: {
        in: ids.rateTypeIds,
      },
    },
  });
  await tx.seatCategory.deleteMany({
    where: {
      id: {
        in: ids.seatCategoryIds,
      },
    },
  });
  await tx.performance.deleteMany({
    where: {
      id: {
        in: ids.performanceIds,
      },
    },
  });
  await tx.event.deleteMany({
    where: {
      id: {
        in: ids.eventIds,
      },
    },
  });
  await tx.seat.deleteMany({
    where: {
      id: {
        in: ids.seatIds,
      },
    },
  });
  await tx.seatLayout.deleteMany({
    where: {
      id: {
        in: ids.seatLayoutIds,
      },
    },
  });
  await tx.venue.deleteMany({
    where: {
      id: {
        in: ids.venueIds,
      },
    },
  });
  await tx.organizerMember.deleteMany({
    where: {
      organizerId: seedOrganizer.id,
    },
  });
  await tx.organizerInvitation.deleteMany({
    where: {
      OR: [
        {
          organizerId: seedOrganizer.id,
        },
        {
          inviterId: seedOrganizerUser.id,
        },
      ],
    },
  });
  await tx.organizerFeature.deleteMany({
    where: {
      organizerId: seedOrganizer.id,
    },
  });
  await tx.organizer.deleteMany({
    where: {
      id: seedOrganizer.id,
    },
  });
  await tx.companyBankAccount.deleteMany({
    where: {
      companyId: seedCompany.id,
    },
  });
  await tx.company.deleteMany({
    where: {
      id: seedCompany.id,
    },
  });
  await tx.account.deleteMany({
    where: {
      userId: seedOrganizerUser.id,
    },
  });
  await tx.session.deleteMany({
    where: {
      userId: seedOrganizerUser.id,
    },
  });
  await tx.user.deleteMany({
    where: {
      id: seedOrganizerUser.id,
    },
  });
}

function collectSeedIds(scenarios: SeedEventScenario[]) {
  return {
    venueIds: scenarios.map((scenario) => scenario.venue.id),
    seatLayoutIds: scenarios.flatMap((scenario) =>
      scenario.seatLayout ? [scenario.seatLayout.id] : [],
    ),
    seatIds: scenarios.flatMap((scenario) => scenario.seats.map((seat) => seat.id)),
    eventIds: scenarios.map((scenario) => scenario.event.id),
    performanceIds: scenarios.flatMap((scenario) =>
      scenario.performances.map((performance) => performance.id),
    ),
    seatCategoryIds: scenarios.flatMap((scenario) =>
      scenario.seatCategories.map((seatCategory) => seatCategory.id),
    ),
    rateTypeIds: scenarios.flatMap((scenario) => scenario.rateTypes.map((rateType) => rateType.id)),
    saleWindowIds: scenarios.flatMap((scenario) =>
      scenario.saleWindows.map((saleWindow) => saleWindow.id),
    ),
    inventoryPoolIds: scenarios.flatMap((scenario) =>
      scenario.inventoryPools.map((inventoryPool) => inventoryPool.id),
    ),
    inventoryUnitIds: scenarios.flatMap((scenario) =>
      scenario.inventoryUnits.map((inventoryUnit) => inventoryUnit.id),
    ),
    saleOfferIds: scenarios.flatMap((scenario) =>
      scenario.saleOffers.map((saleOffer) => saleOffer.id),
    ),
    saleOfferRateIds: scenarios.flatMap((scenario) =>
      scenario.saleOfferRates.map((saleOfferRate) => saleOfferRate.id),
    ),
    saleOfferEntitlementIds: scenarios.flatMap((scenario) =>
      scenario.saleOfferEntitlements.map((saleOfferEntitlement) => saleOfferEntitlement.id),
    ),
  };
}

if (import.meta.main) {
  try {
    const result = await seedDatabase(db);
    console.info(
      [
        "Seed data created.",
        `events=${result.eventCount}`,
        `performances=${result.performanceCount}`,
        `saleWindows=${result.saleWindowCount}`,
        `saleOffers=${result.saleOfferCount}`,
        `inventoryUnits=${result.inventoryUnitCount}`,
      ].join(" "),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
