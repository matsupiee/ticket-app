import { expect, test, type Page, type Route } from "@playwright/test";

test("主催者が登録後に整理番号先着イベントを作成して公開できる", async ({ page }) => {
  const authState = {
    user: null as null | { id: string; name: string; email: string },
  };
  const organizer = {
    eventOrganizerId: "organizer-e2e",
    name: "新宿ライブ制作",
    slug: "shinjuku-live",
    role: "EDITOR",
  } as const;
  const events: OrganizerEvent[] = [];

  await mockAuth(page, authState);
  await mockRpc(page, organizer, events);

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
  await expect(page.getByRole("heading", { name: "イベント新規作成" })).toBeVisible();

  await page.getByLabel("イベント名").fill("E2E整理番号公演");
  await page.getByLabel("会場").fill("新宿ライブホール");
  await page.getByLabel("席種").fill("スタンディング");
  await page.getByLabel("料金種別").fill("一般");
  await page.getByLabel("価格").fill("5000");
  await page.getByRole("spinbutton", { name: "販売枚数" }).fill("30");
  await page.getByRole("button", { name: "作成して公開" }).click();

  await expect(page.getByRole("heading", { name: "イベント設定" })).toBeVisible();
  await expect(page.getByText("E2E整理番号公演", { exact: true })).toBeVisible();
  await expect(page.getByText("販売中", { exact: true })).toBeVisible();
  await expect(page.getByText(/先着 \/ 2026年7月20日/)).toBeVisible();
  await expect(page.getByText("販売中", { exact: true })).toBeVisible();
  await expect(page.getByText("一般販売")).toBeVisible();
  await expect(page.getByText("スタンディング / 販売済み 0枚 / 残り 30枚")).toBeVisible();

  await page
    .getByRole("textbox", { name: "イベント名", exact: true })
    .fill("E2E整理番号公演 追加公演");
  await page.getByLabel("会場").fill("渋谷ライブホール");
  await page.getByRole("spinbutton", { name: "価格" }).fill("6500");
  await page.getByRole("button", { name: "設定を保存" }).click();
  await expect(page.getByText("E2E整理番号公演 追加公演 の設定を保存しました")).toBeVisible();
  expect(events[0]).toMatchObject({
    name: "E2E整理番号公演 追加公演",
    performances: [{ venueName: "渋谷ライブホール" }],
    saleWindows: [{ offers: [{ minPrice: 6_500 }] }],
  });
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

type OrganizerEvent = {
  id: string;
  name: string;
  description: string;
  status: "ON_SALE";
  location: string;
  tags: string[];
  performances: {
    id: string;
    name: string;
    venueName: string;
    startsAt: string;
    doorsOpenAt: string;
    admissionMethod: "NUMBERED_ENTRY";
  }[];
  saleWindows: {
    id: string;
    name: string;
    saleMethod: "FIRST_COME" | "LOTTERY";
    opensAt: string;
    closesAt: string;
    offers: {
      id: string;
      name: string;
      seatCategoryName: string;
      soldQuantity: number;
      availableQuantity: number;
      minPrice: number;
      maxQuantityPerOrder: number;
    }[];
  }[];
  sales: {
    grossSales: number;
    ticketsSold: number;
    buyerFeeAmount: number;
    organizerFeeAmount: number;
  };
  settlement: {
    status: "SCHEDULED";
    scheduledAt: string;
  };
};

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
  events: OrganizerEvent[],
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
      await route.fulfill(
        rpcResponse({
          items: events,
          summary: {
            eventCount: events.length,
            onSaleEventCount: events.length,
            ticketsSold: 0,
            grossSales: 0,
            organizerFeeAmount: 0,
            settlementAmount: 0,
          },
        }),
      );
      return;
    }

    if (pathname.endsWith("/organizer/event/create")) {
      const body = request.postDataJSON() as {
        json?: {
          name?: string;
          description?: string;
          publicTicketing?: { saleMethod?: "FIRST_COME" | "LOTTERY" };
        };
        name?: string;
        description?: string;
        publicTicketing?: { saleMethod?: "FIRST_COME" | "LOTTERY" };
      };
      events.splice(0, events.length, buildCreatedEvent(body.json ?? body));
      await route.fulfill(
        rpcResponse({
          id: "event-e2e",
          updatedAt: "2026-07-20T00:00:00.000Z",
        }),
      );
      return;
    }

    if (pathname.endsWith("/organizer/event/get")) {
      await route.fulfill(rpcResponse(events[0]));
      return;
    }

    if (pathname.endsWith("/organizer/event/update")) {
      const body = request.postDataJSON() as {
        json?: {
          name?: string;
          description?: string;
          publicTicketing?: { venueName?: string; price?: number };
        };
        name?: string;
        description?: string;
        publicTicketing?: { venueName?: string; price?: number };
      };
      const input = body.json ?? body;
      if (events[0]) {
        events[0].name = input.name ?? events[0].name;
        events[0].description = input.description ?? events[0].description;
        events[0].performances[0].venueName =
          input.publicTicketing?.venueName ?? events[0].performances[0].venueName;
        events[0].saleWindows[0].offers[0].minPrice =
          input.publicTicketing?.price ?? events[0].saleWindows[0].offers[0].minPrice;
      }
      await route.fulfill(
        rpcResponse({
          id: events[0]?.id ?? "event-e2e",
          updatedAt: "2026-07-20T00:00:00.000Z",
        }),
      );
      return;
    }

    await route.fulfill(rpcResponse({}));
  });
}

function buildCreatedEvent(
  input: {
    name?: string;
    description?: string;
    publicTicketing?: { saleMethod?: "FIRST_COME" | "LOTTERY" };
  } = {},
): OrganizerEvent {
  return {
    id: "event-e2e",
    name: input.name ?? "E2E整理番号公演",
    description: input.description ?? "整理番号順に入場する先着販売イベントです。",
    status: "ON_SALE",
    location: "新宿ライブホール",
    tags: ["整理番号", "先着", "電子チケット"],
    performances: [
      {
        id: "event-e2e-performance",
        name: "本公演",
        venueName: "新宿ライブホール",
        startsAt: "2026-08-20T18:00:00.000Z",
        doorsOpenAt: "2026-08-20T17:00:00.000Z",
        admissionMethod: "NUMBERED_ENTRY",
      },
    ],
    saleWindows: [
      {
        id: "event-e2e-sale-window",
        name: "一般販売",
        saleMethod: input.publicTicketing?.saleMethod ?? "FIRST_COME",
        opensAt: "2026-07-20T00:00:00.000Z",
        closesAt: "2026-08-20T08:00:00.000Z",
        offers: [
          {
            id: "event-e2e-offer",
            name: "スタンディング",
            seatCategoryName: "スタンディング",
            soldQuantity: 0,
            availableQuantity: 30,
            minPrice: 5_000,
            maxQuantityPerOrder: 4,
          },
        ],
      },
    ],
    sales: {
      grossSales: 0,
      ticketsSold: 0,
      buyerFeeAmount: 0,
      organizerFeeAmount: 0,
    },
    settlement: {
      status: "SCHEDULED",
      scheduledAt: "2026-09-28T01:00:00.000Z",
    },
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
