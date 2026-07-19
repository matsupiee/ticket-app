import { expect, test, type Page, type Route } from "@playwright/test";

const fanEvent = {
  id: "numbered-entry-live",
  name: "整理番号ライブ",
  description: "整理番号順に入場する先着販売イベントです。",
  eventOrganizerName: "新宿ライブ制作",
  location: "新宿ライブホール",
  imageUrl: "/events/bay-side-fes.svg",
  tags: ["整理番号", "先着", "電子チケット"],
  rateTypes: [{ id: "general", name: "一般", displayOrder: 0 }],
  performances: [
    {
      id: "numbered-entry-live-main",
      name: "本公演",
      venueName: "新宿ライブホール",
      doorsOpenAt: "2026-08-20T17:00:00.000Z",
      startsAt: "2026-08-20T18:00:00.000Z",
      admissionMethod: "NUMBERED_ENTRY",
    },
  ],
  saleWindows: [
    {
      id: "numbered-entry-live-general",
      name: "一般販売",
      saleMethod: "FIRST_COME",
      opensAt: "2026-07-20T00:00:00.000Z",
      closesAt: "2026-08-20T08:00:00.000Z",
      isSmsAuthRequired: false,
      feeRules: [],
      offers: [
        {
          id: "numbered-entry-live-standing",
          name: "スタンディング",
          seatCategoryName: "スタンディング",
          description: "整理番号順に入場します。",
          maxQuantityPerOrder: 4,
          availableQuantity: 30,
          performanceIds: ["numbered-entry-live-main"],
          rates: [
            {
              rateTypeId: "general",
              price: 5_000,
              currency: "JPY",
              minQuantity: 1,
              maxQuantity: 4,
              quantityStep: 1,
            },
          ],
        },
      ],
    },
  ],
};

test("一般ユーザーが登録後に整理番号先着イベントを購入し、2タップでもぎれる", async ({ page }) => {
  const authState = {
    user: null as null | { id: string; name: string; email: string },
  };
  const tickets: Array<{
    id: string;
    eventId: string;
    eventName: string;
    performanceId: string;
    performanceName: string;
    startsAt: string;
    venueName: string;
    seatCategoryName: string;
    entryNumber: number;
    status: "ACTIVE" | "USED";
    serialNumber: string;
  }> = [];

  await mockAuth(page, authState);
  await mockRpc(page, tickets);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "ユーザー登録" })).toBeVisible();
  await page.getByLabel("名前").fill("一般ユーザー");
  await page.getByLabel("メールアドレス").fill("fan@example.com");
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "登録" }).click();

  await expect(page.getByRole("heading", { name: "マイページ" })).toBeVisible();
  await page.getByRole("link", { name: "イベント" }).click();

  await expect(page.getByRole("heading", { name: "イベントを探す" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "整理番号ライブ" })).toBeVisible();
  await page.getByRole("link", { name: "詳細を見る" }).click();

  await expect(page.getByRole("heading", { name: "整理番号ライブ" })).toBeVisible();
  await expect(page.getByText("整理番号順に入場します。")).toBeVisible();
  await page.getByRole("link", { name: "チケットを申し込む" }).click();

  await expect(page.getByRole("heading", { name: "チケット申し込み" })).toBeVisible();
  await page.getByLabel("枚数").selectOption("2");
  await expect(page.getByLabel("申し込み金額")).toContainText("￥10,000");
  await page.getByRole("button", { name: "申し込み内容を確定" }).click();

  await expect(page.getByRole("heading", { name: "申し込みが完了しました" })).toBeVisible();
  await expect(page.getByText("￥10,000")).toBeVisible();
  await page.getByRole("link", { name: "発券されたチケットを見る" }).click();

  const ticketCard = page.getByRole("button", { name: /整理番号ライブ/ }).first();
  await expect(ticketCard).toContainText("整理番号 1");
  await ticketCard.click();
  await expect(ticketCard).toContainText("もう一度タップで入場");
  await ticketCard.click();

  await expect(page.getByText("入場済み").first()).toBeVisible();
});

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
        id: "fan-user",
        name: body.name ?? "一般ユーザー",
        email: body.email,
      };

      await route.fulfill(
        corsResponse({
          body: JSON.stringify({
            token: "fan-session-token",
            user: authState.user,
          }),
        }),
      );
      return;
    }

    if (pathname.endsWith("/sign-out")) {
      authState.user = null;
      await route.fulfill(corsResponse({ body: JSON.stringify({ success: true }) }));
      return;
    }

    await route.fulfill(corsResponse({ body: JSON.stringify({}) }));
  });
}

async function mockRpc(
  page: Page,
  tickets: Array<{
    id: string;
    eventId: string;
    eventName: string;
    performanceId: string;
    performanceName: string;
    startsAt: string;
    venueName: string;
    seatCategoryName: string;
    entryNumber: number;
    status: "ACTIVE" | "USED";
    serialNumber: string;
  }>,
) {
  await page.route("**/rpc/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === "OPTIONS") {
      await route.fulfill(corsResponse({ status: 204 }));
      return;
    }

    if (pathname.endsWith("/fan/event/list")) {
      await route.fulfill(
        rpcResponse({
          items: [
            {
              id: fanEvent.id,
              name: fanEvent.name,
              description: fanEvent.description,
              eventOrganizerName: fanEvent.eventOrganizerName,
              location: fanEvent.location,
              imageUrl: fanEvent.imageUrl,
              tags: fanEvent.tags,
              firstPerformanceStartsAt: fanEvent.performances[0].startsAt,
              saleMethods: ["FIRST_COME"],
              minPrice: 5_000,
            },
          ],
        }),
      );
      return;
    }

    if (pathname.endsWith("/fan/event/get")) {
      await route.fulfill(rpcResponse(fanEvent));
      return;
    }

    if (pathname.endsWith("/fan/application/submit")) {
      tickets.splice(
        0,
        tickets.length,
        {
          id: "ticket-1",
          eventId: fanEvent.id,
          eventName: fanEvent.name,
          performanceId: fanEvent.performances[0].id,
          performanceName: fanEvent.performances[0].name,
          startsAt: fanEvent.performances[0].startsAt,
          venueName: fanEvent.performances[0].venueName,
          seatCategoryName: "スタンディング",
          entryNumber: 1,
          status: "ACTIVE",
          serialNumber: "TKT-E2E-0001",
        },
        {
          id: "ticket-2",
          eventId: fanEvent.id,
          eventName: fanEvent.name,
          performanceId: fanEvent.performances[0].id,
          performanceName: fanEvent.performances[0].name,
          startsAt: fanEvent.performances[0].startsAt,
          venueName: fanEvent.performances[0].venueName,
          seatCategoryName: "スタンディング",
          entryNumber: 2,
          status: "ACTIVE",
          serialNumber: "TKT-E2E-0002",
        },
      );
      await route.fulfill(
        rpcResponse({
          orderId: "order-e2e",
          status: "ORDER_CREATED",
          orderStatus: "PAID",
          subtotalAmount: 10_000,
          buyerFeeAmount: 0,
          organizerFeeAmount: 0,
          totalAmount: 10_000,
          currency: "JPY",
        }),
      );
      return;
    }

    if (pathname.endsWith("/fan/ticket/list")) {
      await route.fulfill(
        rpcResponse({
          items: tickets,
        }),
      );
      return;
    }

    if (pathname.endsWith("/fan/ticket/use")) {
      const ticket = tickets[0];
      if (ticket) {
        ticket.status = "USED";
      }
      await route.fulfill(
        rpcResponse({
          id: ticket?.id ?? "ticket-1",
          status: "USED",
          usedAt: "2026-08-20T09:05:00.000Z",
        }),
      );
      return;
    }

    await route.fulfill(rpcResponse({}));
  });
}

function buildSession(user: { id: string; name: string; email: string }) {
  return {
    session: {
      id: "fan-session",
      userId: user.id,
      token: "fan-session-token",
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

function rpcResponse(json: unknown) {
  return corsResponse({
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
      "access-control-allow-origin": "http://127.0.0.1:4173",
    },
    body: input.body ?? "",
  } satisfies Parameters<Route["fulfill"]>[0];
}
