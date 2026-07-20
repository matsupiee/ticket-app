import { describe, expect, inject, it } from "vitest";

const { serverUrl } = inject("apiIntegration");

describe("fan event quote-application handler", () => {
  it("存在しない販売情報の場合はNOT_FOUNDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/fan/event/quoteApplication`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        json: {
          eventId: crypto.randomUUID(),
          saleWindowId: crypto.randomUUID(),
          performanceId: crypto.randomUUID(),
          offerId: crypto.randomUUID(),
          rateTypeId: crypto.randomUUID(),
          quantity: 1,
        },
      }),
    });

    expect(response.status).toBe(404);
  });
});
