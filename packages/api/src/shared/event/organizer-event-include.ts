// organizer.event.get / organizer.event.list で共通して使う Prisma の include 定義。
// 販売数・売上・在庫の整合性チェックに必要な関連データを一括で取得する。
export function organizerEventInclude() {
  return {
    organizer: true,
    seatCategories: {
      orderBy: {
        displayOrder: "asc" as const,
      },
    },
    performances: {
      orderBy: {
        startsAt: "asc" as const,
      },
      include: {
        venue: true,
        inventoryPools: true,
      },
    },
    rateTypes: {
      orderBy: {
        displayOrder: "asc" as const,
      },
    },
    saleWindows: {
      orderBy: {
        applicationStartsAt: "asc" as const,
      },
      include: {
        feeRules: {
          orderBy: {
            displayOrder: "asc" as const,
          },
        },
        saleOffers: {
          orderBy: {
            displayOrder: "asc" as const,
          },
          include: {
            saleOfferRates: {
              orderBy: {
                displayOrder: "asc" as const,
              },
              include: {
                orderItems: {
                  where: {
                    order: {
                      status: "PAID" as const,
                    },
                  },
                  include: {
                    orderFeeLines: true,
                  },
                },
              },
            },
            saleOfferEntitlements: {
              include: {
                inventoryPool: {
                  include: {
                    seatCategory: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
