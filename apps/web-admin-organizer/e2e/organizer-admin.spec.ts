import { expect, test, type Page, type Request, type Route } from "@playwright/test";

test("主催者が登録後にウィザードで整理番号先着イベントを作成して公開できる", async ({ page }) => {
  const authState = {
    user: null as null | { id: string; name: string; email: string },
  };
  const organizer = {
    eventOrganizerId: "organizer-e2e",
    name: "新宿ライブ制作",
    slug: "shinjuku-live",
    role: "EDITOR",
  } as const;
  const store = createEventStore();

  await mockAuth(page, authState);
  await mockRpc(page, organizer, store);

  await page.goto("/login");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page.getByRole("heading", { name: "主催者登録" })).toBeVisible();
  await page.getByLabel("名前").fill("主催者ユーザー");
  await page.getByLabel("主催者名").fill(organizer.name);
  await page.getByLabel("メールアドレス").fill("organizer-e2e@example.com");
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(page.getByRole("heading", { name: "主催者ダッシュボード" })).toBeVisible();
  await page.getByRole("link", { name: "イベントを作成" }).click();
  await expect(page.getByRole("heading", { name: "イベントを作成" })).toBeVisible();

  // STEP 1: 基本情報
  await page.getByLabel("イベント名").fill("E2E整理番号公演");
  await page.getByLabel("説明").fill("整理番号順に入場する先着販売イベントです。");
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP 2: 公演
  await expect(page.getByRole("heading", { name: "公演" })).toBeVisible();
  await page.getByRole("button", { name: "公演を追加" }).click();
  await page.getByLabel("公演1の名称").fill("本公演");
  await page.getByLabel("公演1の会場").fill("新宿ライブホール");
  await page.getByLabel("公演1の月日").fill("2026-08-20");
  await page.getByLabel("公演1の開場時刻").fill("23:30");
  await page.getByLabel("公演1の開始時刻").fill("00:00");
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP 3: 席種
  await expect(page.getByRole("heading", { name: "席種" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 席種を追加" }).click();
  await page.getByLabel("席種1の名称").fill("スタンディング");
  await page.getByLabel("本公演 × スタンディングの在庫数").fill("30");
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP 4: 料金種別
  await expect(page.getByRole("heading", { name: "料金種別" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 料金種別を追加" }).click();
  await page.getByLabel("料金種別1の名称").fill("一般");
  await page.getByLabel("スタンディング × 一般の標準価格").fill("5000");
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP 5: 販売受付
  await expect(page.getByRole("heading", { name: "販売受付" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 受付を追加（一般販売など）" }).click();
  await page.getByLabel("受付名").fill("一般販売");
  await page.getByLabel("申込開始").fill("2026-07-25T10:00");
  await page.getByLabel("申込終了").fill("2026-08-19T23:59");

  await page.getByRole("button", { name: "＋ 券を追加" }).click();
  await expect(page.getByRole("heading", { name: "券を追加" })).toBeVisible();
  const addOfferDialog = page.getByRole("dialog");
  await expect(addOfferDialog.locator("#offer-performance")).toContainText("本公演");
  await expect(addOfferDialog.locator("#offer-performance")).not.toContainText("performance-");
  await expect(addOfferDialog.locator("#offer-seat-category")).toContainText("スタンディング");
  await expect(addOfferDialog.locator("#offer-seat-category")).not.toContainText("seat-category-");
  await page.getByRole("button", { name: "追加する" }).click();

  await expect(page.locator("main").getByText("スタンディング")).toBeVisible();
  await page.getByRole("button", { name: "作成して公開" }).click();

  await expect(page.getByText("イベントを作成して公開しました")).toBeVisible();
  await expect(page.getByRole("heading", { name: "E2E整理番号公演" })).toBeVisible();

  const event = store.events[0];
  expect(event).toMatchObject({
    name: "E2E整理番号公演",
    performances: [{ name: "本公演", venueName: "新宿ライブホール" }],
    seatCategories: [{ name: "スタンディング" }],
    rateTypes: [{ name: "一般" }],
  });
  expect(event.performances[0]?.doorsOpenAt).toBe(new Date("2026-08-20T23:30").toISOString());
  expect(event.performances[0]?.startsAt).toBe(new Date("2026-08-21T00:00").toISOString());
  expect(event.inventoryPools[0]).toMatchObject({ capacity: 30 });
  expect(event.saleWindows[0]).toMatchObject({ name: "一般販売", saleMethod: "FIRST_COME" });
  expect(event.saleWindows[0]?.offers[0]?.rates[0]).toMatchObject({ price: 5_000 });
});

test("抽選方式と複数公演にまたがる通し券を設定できる", async ({ page }) => {
  const authState = {
    user: { id: "organizer-user", name: "主催者ユーザー", email: "lottery-e2e@example.com" },
  };
  const organizer = {
    eventOrganizerId: "organizer-e2e",
    name: "横浜ベイ制作",
    slug: "yokohama-bay",
    role: "EDITOR",
  } as const;
  const store = createEventStore();

  await mockAuth(page, authState);
  await mockRpc(page, organizer, store);

  await page.goto("/events/new");
  await expect(page.getByRole("heading", { name: "イベントを作成" })).toBeVisible();

  await page.getByLabel("イベント名").fill("E2E抽選フェス");
  await page.getByLabel("説明").fill("複数公演の抽選イベントです。");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "公演" })).toBeVisible();
  await page.getByRole("button", { name: "公演を追加" }).click();
  await page.getByLabel("公演1の名称").fill("SATURDAY");
  await page.getByLabel("公演1の会場").fill("横浜ベイホール");
  await page.getByLabel("公演1の月日").fill("2026-10-03");
  await page.getByLabel("公演1の開場時刻").fill("10:00");
  await page.getByLabel("公演1の開始時刻").fill("11:00");
  await page.getByRole("button", { name: "公演を追加" }).click();
  await page.getByLabel("公演2の名称").fill("SUNDAY");
  await page.getByLabel("公演2の会場").fill("川崎クラブチッタ");
  await page.getByLabel("公演2の月日").fill("2026-10-04");
  await page.getByLabel("公演2の開場時刻").fill("10:00");
  await page.getByLabel("公演2の開始時刻").fill("11:00");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "席種" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 席種を追加" }).click();
  await page.getByLabel("席種1の名称").fill("スタンディング");
  await page.getByLabel("SATURDAY × スタンディングの在庫数").fill("400");
  await page.getByLabel("SUNDAY × スタンディングの在庫数").fill("400");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "料金種別" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 料金種別を追加" }).click();
  await page.getByLabel("料金種別1の名称").fill("一般");
  await page.getByLabel("スタンディング × 一般の標準価格").fill("9900");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "販売受付" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 受付を追加（一般販売など）" }).click();
  await page.getByLabel("受付名").fill("オフィシャル先行抽選");
  await page.getByRole("button", { name: "抽選" }).click();
  await page.getByLabel("申込開始").fill("2026-08-01T12:00");
  await page.getByLabel("申込終了").fill("2026-08-12T23:59");
  await expect(page.getByLabel("抽選方式")).toBeVisible();
  await page.getByLabel("当落発表日時").fill("2026-08-20T18:00");

  await page.getByRole("button", { name: "＋ 券を追加" }).click();
  await page.getByRole("button", { name: "通し券（複数公演）" }).click();
  await expect(page.getByText("対象公演（複数選択）")).toBeVisible();
  await page.getByRole("button", { name: "SUNDAY" }).click();
  await page.getByRole("button", { name: "追加する" }).click();

  await expect(page.getByText("通し券（SATURDAY・SUNDAY）")).toBeVisible();
  await page.getByRole("button", { name: "作成して公開" }).click();

  await expect(page.getByText("イベントを作成して公開しました")).toBeVisible();

  const event = store.events[0];
  expect(event.saleWindows[0]).toMatchObject({
    name: "オフィシャル先行抽選",
    saleMethod: "LOTTERY",
    lotteryMode: "AUTO",
  });
  expect(event.performances).toMatchObject([
    { name: "SATURDAY", venueName: "横浜ベイホール" },
    { name: "SUNDAY", venueName: "川崎クラブチッタ" },
  ]);
  expect(event.saleWindows[0]?.offers[0]?.entitlements).toHaveLength(2);
});

test("公演を追加するまでStep3へ進めない", async ({ page }) => {
  const authState = {
    user: { id: "organizer-user", name: "主催者ユーザー", email: "guard-e2e@example.com" },
  };
  const organizer = {
    eventOrganizerId: "organizer-e2e",
    name: "品川イベント制作",
    slug: "shinagawa-events",
    role: "EDITOR",
  } as const;
  const store = createEventStore();

  await mockAuth(page, authState);
  await mockRpc(page, organizer, store);

  await page.goto("/events/new");
  await expect(page.getByRole("heading", { name: "イベントを作成" })).toBeVisible();

  await page.getByLabel("イベント名").fill("E2E公演必須イベント");
  await page.getByLabel("説明").fill("公演を追加しないと席種へ進めないことを確認します。");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "公演" })).toBeVisible();
  await expect(page.getByRole("button", { name: "次へ" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /席種/ })).toBeDisabled();

  await page.getByRole("button", { name: "公演を追加" }).click();
  await expect(page.getByRole("button", { name: "次へ" })).toBeEnabled();
  await expect(page.getByRole("button", { name: /席種/ })).toBeEnabled();

  await page.getByRole("button", { name: "公演1を削除" }).click();
  await expect(page.getByRole("button", { name: "次へ" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /席種/ })).toBeDisabled();

  await page.getByRole("button", { name: "公演を追加" }).click();
  await page.getByLabel("公演1の名称").fill("本公演");
  await page.getByLabel("公演1の会場").fill("品川ホール");
  await page.getByLabel("公演1の月日").fill("2026-09-10");
  await page.getByLabel("公演1の開場時刻").fill("17:00");
  await page.getByLabel("公演1の開始時刻").fill("18:00");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "席種" })).toBeVisible();
});

test("既存イベントを開いて在庫を追加できる", async ({ page }) => {
  const authState = {
    user: { id: "organizer-user", name: "主催者ユーザー", email: "edit-e2e@example.com" },
  };
  const organizer = {
    eventOrganizerId: "organizer-e2e",
    name: "京都クラシック",
    slug: "kyoto-classic",
    role: "EDITOR",
  } as const;
  const store = createEventStore();
  store.events.push(buildExistingEvent());

  await mockAuth(page, authState);
  await mockRpc(page, organizer, store);

  await page.goto("/events/event-existing");
  await expect(page.getByRole("heading", { name: "既存イベント" })).toBeVisible();
  await expect(page.getByText("既存の説明文です。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "一般販売" })).toBeVisible();
  await expect(page.getByText("総売上 ￥0 ・ 販売 0 / 100 枚")).toBeVisible();
  await expect(page.getByRole("link", { name: /販売ページを見る/ })).toHaveCount(0);

  await page.getByRole("link", { name: /編集する/ }).click();
  await expect(page).toHaveURL(/\/events\/event-existing\/edit$/);
  await expect(page.getByRole("heading", { name: "既存イベント" })).toBeVisible();
  await expect(page.getByLabel("イベント名")).toHaveValue("既存イベント");

  await page.getByRole("button", { name: "公演" }).click();
  await expect(page.getByLabel("公演1の名称")).toHaveValue("本公演");
  await expect(page.getByLabel("公演1の会場")).toHaveValue("京都コンサートホール");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "席種" })).toBeVisible();
  const inventoryInput = page.getByLabel("本公演 × 指定席の在庫数");
  await expect(inventoryInput).toHaveValue("100");
  await inventoryInput.fill("150");
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "料金種別" })).toBeVisible();
  await expect(page.getByLabel("料金種別1の名称")).toHaveValue("大人");

  const adjustCall = await store.waitForAdjustInventory();
  expect(adjustCall).toMatchObject({ performanceId: "performance-existing", capacityDelta: 50 });
});

test("保存済みの券を編集するとき対象公演と席種を名前で表示する", async ({ page }) => {
  const authState = {
    user: { id: "organizer-user", name: "主催者ユーザー", email: "offer-edit-e2e@example.com" },
  };
  const organizer = {
    eventOrganizerId: "organizer-e2e",
    name: "京都クラシック",
    slug: "kyoto-classic",
    role: "EDITOR",
  } as const;
  const store = createEventStore();
  store.events.push(buildExistingEvent());

  await mockAuth(page, authState);
  await mockRpc(page, organizer, store);

  await page.goto("/events/event-existing");
  await expect(page.getByRole("heading", { name: "既存イベント" })).toBeVisible();

  await page.getByRole("link", { name: /編集する/ }).click();
  await expect(page).toHaveURL(/\/events\/event-existing\/edit$/);
  await expect(page.getByRole("heading", { name: "既存イベント" })).toBeVisible();

  await page.getByRole("button", { name: "販売受付" }).click();
  await expect(page.getByRole("heading", { name: "販売受付" })).toBeVisible();
  await page.getByRole("button", { name: "券を編集" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "券を編集" })).toBeVisible();
  await expect(dialog.locator("#offer-performance")).toContainText("本公演");
  await expect(dialog.locator("#offer-performance")).not.toContainText("performance-existing");
  await expect(dialog.locator("#offer-seat-category")).toContainText("指定席");
  await expect(dialog.locator("#offer-seat-category")).not.toContainText("seat-category-existing");
});

test("未ログインの場合はログイン画面へ誘導する", async ({ page }) => {
  await mockAuth(page, { user: null });
  await page.goto("/sales");

  await expect(page.getByRole("heading", { name: "主催者ログイン" })).toBeVisible();
});

test("主催者メンバーでないユーザーは主催者管理画面を開けない", async ({ page }) => {
  await mockAuth(page, {
    user: {
      id: "non-member",
      name: "権限なしユーザー",
      email: "customer@example.com",
    },
  });
  await page.route("**/rpc/organizer/account/me", async (route) => {
    await route.fulfill(rpcResponse({}, { status: 403 }));
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "権限がありません" })).toBeVisible();
});

type MockPerformance = {
  id: string;
  name: string;
  venueName: string;
  venueId: string;
  startsAt: string;
  doorsOpenAt: string;
  admissionMethod: "NUMBERED_ENTRY";
};

type MockSeatCategory = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  displayOrder: number;
};

type MockRateType = {
  id: string;
  name: string;
  displayOrder: number;
};

type MockInventoryPool = {
  id: string;
  performanceId: string;
  seatCategoryId: string;
  admissionMethod: "NUMBERED_ENTRY";
  seatAllocationMethod: "IMMEDIATE";
  capacity: number;
  heldCount: number;
  soldCount: number;
};

type MockOffer = {
  id: string;
  name: string;
  description: string;
  maxQuantityPerOrder: number;
  displayOrder: number;
  rates: {
    id: string;
    rateTypeId: string;
    price: number;
    currency: string;
    minQuantity: number;
    maxQuantity: number;
    quantityStep: number;
    displayOrder: number;
  }[];
  entitlements: { id: string; performanceId: string; seatCategoryId: string }[];
};

type MockSaleWindow = {
  id: string;
  name: string;
  saleMethod: "FIRST_COME" | "LOTTERY";
  opensAt: string;
  closesAt: string;
  publishesAt?: string;
  isSmsAuthRequired: boolean;
  lotteryMode: "AUTO" | "MANUAL";
  notifyLotteryResultAt?: string;
  canceledAt?: string;
  cancelReason?: string;
  offers: MockOffer[];
};

type MockEvent = {
  id: string;
  name: string;
  description: string;
  performances: MockPerformance[];
  seatCategories: MockSeatCategory[];
  rateTypes: MockRateType[];
  inventoryPools: MockInventoryPool[];
  saleWindows: MockSaleWindow[];
};

type EventStore = {
  events: MockEvent[];
  adjustInventoryCalls: { performanceId: string; seatCategoryId: string; capacityDelta: number }[];
  waitForAdjustInventory: () => Promise<
    { performanceId: string; seatCategoryId: string; capacityDelta: number } | undefined
  >;
};

function createEventStore(): EventStore {
  const events: MockEvent[] = [];
  const adjustInventoryCalls: EventStore["adjustInventoryCalls"] = [];

  return {
    events,
    adjustInventoryCalls,
    waitForAdjustInventory: async () => {
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        if (adjustInventoryCalls.length > 0) {
          return adjustInventoryCalls[0];
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100));
      }
      return undefined;
    },
  };
}

function buildExistingEvent(): MockEvent {
  return {
    id: "event-existing",
    name: "既存イベント",
    description: "既存の説明文です。",
    performances: [
      {
        id: "performance-existing",
        name: "本公演",
        venueName: "京都コンサートホール",
        venueId: "venue-existing",
        startsAt: "2026-11-18T19:00:00.000Z",
        doorsOpenAt: "2026-11-18T18:00:00.000Z",
        admissionMethod: "NUMBERED_ENTRY",
      },
    ],
    seatCategories: [
      {
        id: "seat-category-existing",
        name: "指定席",
        description: "",
        active: true,
        displayOrder: 0,
      },
    ],
    rateTypes: [{ id: "rate-type-existing", name: "大人", displayOrder: 0 }],
    inventoryPools: [
      {
        id: "pool-existing",
        performanceId: "performance-existing",
        seatCategoryId: "seat-category-existing",
        admissionMethod: "NUMBERED_ENTRY",
        seatAllocationMethod: "IMMEDIATE",
        capacity: 100,
        heldCount: 0,
        soldCount: 0,
      },
    ],
    saleWindows: [
      {
        id: "sale-window-existing",
        name: "一般販売",
        saleMethod: "FIRST_COME",
        opensAt: "2026-10-01T10:00:00.000Z",
        closesAt: "2026-11-17T23:59:00.000Z",
        publishesAt: futureIso(),
        isSmsAuthRequired: false,
        lotteryMode: "AUTO",
        offers: [
          {
            id: "offer-existing",
            name: "指定席",
            description: "",
            maxQuantityPerOrder: 4,
            displayOrder: 0,
            rates: [
              {
                id: "offer-rate-existing",
                rateTypeId: "rate-type-existing",
                price: 10_000,
                currency: "JPY",
                minQuantity: 1,
                maxQuantity: 4,
                quantityStep: 1,
                displayOrder: 0,
              },
            ],
            entitlements: [
              {
                id: "entitlement-existing",
                performanceId: "performance-existing",
                seatCategoryId: "seat-category-existing",
              },
            ],
          },
        ],
      },
    ],
  };
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

async function mockAuth(
  page: Page,
  authState: {
    user: null | { id: string; name: string; email: string };
  },
) {
  await page.route("**/api/auth/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill(corsResponse({ status: 204 }));
      return;
    }

    if (pathname.endsWith("/get-session")) {
      await route.fulfill(
        corsResponse({
          body: authState.user
            ? JSON.stringify(buildSession(authState.user))
            : JSON.stringify(null),
        }),
      );
      return;
    }

    if (pathname.endsWith("/sign-up/email") || pathname.endsWith("/sign-in/email")) {
      const body = request.postDataJSON() as { name?: string; email: string };
      authState.user = {
        id: "organizer-user",
        name: body.name ?? "主催者ユーザー",
        email: body.email,
      };

      await route.fulfill(
        corsResponse({
          body: JSON.stringify({
            token: "organizer-session-token",
            user: authState.user,
          }),
        }),
      );
      return;
    }

    await route.fulfill(corsResponse({ body: JSON.stringify({}) }));
  });
}

async function mockRpc(
  page: Page,
  organizer: {
    eventOrganizerId: string;
    name: string;
    slug: string;
    role: "EDITOR";
  },
  store: EventStore,
) {
  await page.route("**/rpc/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill(corsResponse({ status: 204 }));
      return;
    }

    if (pathname.endsWith("/organizer/account/sign-up")) {
      await route.fulfill(rpcResponse(organizer));
      return;
    }

    if (pathname.endsWith("/organizer/account/me")) {
      await route.fulfill(rpcResponse(organizer));
      return;
    }

    if (pathname.endsWith("/organizer/event/list")) {
      const items = store.events.map((event) => toEventSummary(event));
      await route.fulfill(
        rpcResponse({
          items,
          summary: {
            eventCount: items.length,
            onSaleEventCount: items.length,
            ticketsSold: 0,
            grossSales: 0,
            organizerFeeAmount: 0,
            settlementAmount: 0,
          },
        }),
      );
      return;
    }

    const input = readInput(request);

    if (pathname.endsWith("/organizer/event/create")) {
      const created: MockEvent = {
        id: nextId("event"),
        name: input.name ?? "",
        description: input.description ?? "",
        performances: [],
        seatCategories: [],
        rateTypes: [],
        inventoryPools: [],
        saleWindows: [],
      };
      store.events.push(created);
      await route.fulfill(rpcResponse({ id: created.id, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/update")) {
      const event = findEvent(store, input.eventId);
      if (event) {
        event.name = input.name ?? event.name;
        event.description = input.description ?? event.description;
      }
      await route.fulfill(rpcResponse({ id: event?.id ?? input.eventId, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/get")) {
      const event = findEvent(store, input.eventId) ?? store.events[0];
      await route.fulfill(rpcResponse(event ? toEventDetail(event) : null));
      return;
    }

    if (pathname.endsWith("/organizer/event/upsertPerformance")) {
      const event = findEvent(store, input.eventId);
      if (!event) {
        await route.fulfill(rpcResponse({}, { status: 404 }));
        return;
      }
      const existing = event.performances.find(
        (performance) => performance.id === input.performanceId,
      );
      const performance: MockPerformance = {
        id: existing?.id ?? nextId("performance"),
        name: input.name,
        venueName: input.venueName,
        venueId: existing?.venueId ?? nextId("venue"),
        startsAt: toIso(input.startsAt),
        doorsOpenAt: toIso(input.doorsOpenAt),
        admissionMethod: "NUMBERED_ENTRY",
      };
      upsertById(event.performances, performance);
      await route.fulfill(rpcResponse({ id: performance.id, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/upsertSeatCategory")) {
      const event = findEvent(store, input.eventId);
      if (!event) {
        await route.fulfill(rpcResponse({}, { status: 404 }));
        return;
      }
      const seatCategory: MockSeatCategory = {
        id: input.seatCategoryId ?? nextId("seat-category"),
        name: input.name,
        description: input.description ?? "",
        active: input.active,
        displayOrder: input.displayOrder ?? 0,
      };
      upsertById(event.seatCategories, seatCategory);
      await route.fulfill(rpcResponse({ id: seatCategory.id, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/upsertRateType")) {
      const event = findEvent(store, input.eventId);
      if (!event) {
        await route.fulfill(rpcResponse({}, { status: 404 }));
        return;
      }
      const rateType: MockRateType = {
        id: input.rateTypeId ?? nextId("rate-type"),
        name: input.name,
        displayOrder: input.displayOrder ?? 0,
      };
      upsertById(event.rateTypes, rateType);
      await route.fulfill(rpcResponse({ id: rateType.id, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/adjustInventory")) {
      const event = findEvent(store, input.eventId);
      if (!event) {
        await route.fulfill(rpcResponse({}, { status: 404 }));
        return;
      }
      store.adjustInventoryCalls.push({
        performanceId: input.performanceId,
        seatCategoryId: input.seatCategoryId,
        capacityDelta: input.capacityDelta,
      });
      let pool = event.inventoryPools.find(
        (candidate) =>
          candidate.performanceId === input.performanceId &&
          candidate.seatCategoryId === input.seatCategoryId,
      );
      if (!pool) {
        pool = {
          id: nextId("pool"),
          performanceId: input.performanceId,
          seatCategoryId: input.seatCategoryId,
          admissionMethod: "NUMBERED_ENTRY",
          seatAllocationMethod: "IMMEDIATE",
          capacity: 0,
          heldCount: 0,
          soldCount: 0,
        };
        event.inventoryPools.push(pool);
      }
      pool.capacity += input.capacityDelta;
      await route.fulfill(rpcResponse({ id: pool.id, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/upsertSaleWindow")) {
      const event = findEvent(store, input.eventId);
      if (!event) {
        await route.fulfill(rpcResponse({}, { status: 404 }));
        return;
      }
      const existing = event.saleWindows.find((saleWindow) => saleWindow.id === input.saleWindowId);
      const saleWindow: MockSaleWindow = {
        id: existing?.id ?? nextId("sale-window"),
        name: input.name,
        saleMethod: input.method,
        opensAt: toIso(input.applicationStartsAt),
        closesAt: toIso(input.applicationEndsAt),
        publishesAt: input.publishesAt ? toIso(input.publishesAt) : undefined,
        isSmsAuthRequired: input.isSmsAuthRequired,
        lotteryMode: input.lotteryMode,
        notifyLotteryResultAt: input.notifyLotteryResultAt
          ? toIso(input.notifyLotteryResultAt)
          : undefined,
        offers: existing?.offers ?? [],
      };
      upsertById(event.saleWindows, saleWindow);
      await route.fulfill(rpcResponse({ id: saleWindow.id, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/upsertSaleOffer")) {
      const event = findEvent(store, input.eventId);
      const saleWindow = event?.saleWindows.find(
        (candidate) => candidate.id === input.saleWindowId,
      );
      if (!event || !saleWindow) {
        await route.fulfill(rpcResponse({}, { status: 404 }));
        return;
      }
      const existing = saleWindow.offers.find((offer) => offer.id === input.saleOfferId);
      const offer: MockOffer = {
        id: existing?.id ?? nextId("offer"),
        name: input.name,
        description: input.description ?? "",
        maxQuantityPerOrder: input.maxQuantityPerOrder,
        displayOrder: input.displayOrder ?? 0,
        rates: (input.rates as Omit<MockOffer["rates"][number], "id">[]).map((rate, index) => ({
          id: existing?.rates[index]?.id ?? nextId("rate"),
          ...rate,
        })),
        entitlements: (input.entitlements as Omit<MockOffer["entitlements"][number], "id">[]).map(
          (entitlement, index) => ({
            id: existing?.entitlements[index]?.id ?? nextId("entitlement"),
            ...entitlement,
          }),
        ),
      };
      upsertById(saleWindow.offers, offer);
      await route.fulfill(rpcResponse({ id: offer.id, updatedAt: nowIso() }));
      return;
    }

    if (pathname.endsWith("/organizer/event/cancelSaleWindow")) {
      const event = findEvent(store, input.eventId);
      const saleWindow = event?.saleWindows.find(
        (candidate) => candidate.id === input.saleWindowId,
      );
      if (saleWindow) {
        saleWindow.canceledAt = nowIso();
        saleWindow.cancelReason = input.cancelReason;
      }
      await route.fulfill(
        rpcResponse({ id: saleWindow?.id ?? input.saleWindowId, updatedAt: nowIso() }),
      );
      return;
    }

    await route.fulfill(rpcResponse({}));
  });
}

function readInput(request: Request) {
  if (request.method() === "GET") {
    const url = new URL(request.url());
    const raw = url.searchParams.get("data");
    const parsed = raw ? (JSON.parse(raw) as { json?: Record<string, unknown> }) : {};
    return (parsed.json ?? {}) as Record<string, any>;
  }

  const body = request.postDataJSON() as
    | { json?: Record<string, unknown> }
    | Record<string, unknown>;
  return ("json" in body ? body.json : body) as Record<string, any>;
}

function findEvent(store: EventStore, eventId: string | undefined) {
  return store.events.find((event) => event.id === eventId);
}

function upsertById<T extends { id: string }>(list: T[], item: T) {
  const index = list.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) {
    list[index] = item;
  } else {
    list.push(item);
  }
}

function toIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
}

function toEventSummary(event: MockEvent) {
  return { ...toEventDetail(event) };
}

function toEventDetail(event: MockEvent) {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    status: event.saleWindows.some((saleWindow) => !saleWindow.canceledAt) ? "ON_SALE" : "DRAFT",
    location: event.performances[0]?.venueName ?? "会場未定",
    tags: ["整理番号", "電子チケット"],
    seatCategories: event.seatCategories,
    rateTypes: event.rateTypes,
    inventoryPools: event.inventoryPools,
    performances: event.performances,
    saleWindows: event.saleWindows.map((saleWindow) => ({
      id: saleWindow.id,
      name: saleWindow.name,
      saleMethod: saleWindow.saleMethod,
      opensAt: saleWindow.opensAt,
      closesAt: saleWindow.closesAt,
      publishesAt: saleWindow.publishesAt,
      isSmsAuthRequired: saleWindow.isSmsAuthRequired,
      lotteryMode: saleWindow.lotteryMode,
      notifyLotteryResultAt: saleWindow.notifyLotteryResultAt,
      canceledAt: saleWindow.canceledAt,
      cancelReason: saleWindow.cancelReason,
      offers: saleWindow.offers.map((offer) => ({
        id: offer.id,
        name: offer.name,
        description: offer.description,
        displayOrder: offer.displayOrder,
        seatCategoryName:
          event.seatCategories.find(
            (seatCategory) => seatCategory.id === offer.entitlements[0]?.seatCategoryId,
          )?.name ?? "席種未設定",
        soldQuantity: 0,
        availableQuantity: 30,
        minPrice: offer.rates.length > 0 ? Math.min(...offer.rates.map((rate) => rate.price)) : 0,
        maxQuantityPerOrder: offer.maxQuantityPerOrder,
        rates: offer.rates,
        entitlements: offer.entitlements,
      })),
    })),
    sales: { grossSales: 0, ticketsSold: 0, buyerFeeAmount: 0, organizerFeeAmount: 0 },
    settlement: { status: "SCHEDULED", scheduledAt: "2026-09-28T01:00:00.000Z" },
  };
}

function buildSession(user: { id: string; name: string; email: string }) {
  return {
    session: {
      id: "organizer-session",
      userId: user.id,
      token: "organizer-session-token",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      expiresAt: "2026-07-21T00:00:00.000Z",
    },
    user: {
      ...user,
      emailVerified: true,
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    },
  };
}

function rpcResponse(json: unknown, input: { status?: number } = {}) {
  return corsResponse({
    status: input.status,
    body: JSON.stringify({ json }),
  });
}

function corsResponse(input: { status?: number; body?: string }) {
  return {
    status: input.status ?? 200,
    contentType: "application/json",
    headers: {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-origin": "http://127.0.0.1:4174",
    },
    body: input.body ?? "",
  } satisfies Parameters<Route["fulfill"]>[0];
}
