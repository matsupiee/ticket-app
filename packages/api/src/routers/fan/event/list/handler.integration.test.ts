import { describe, expect, inject, it } from "vitest";

const { serverUrl } = inject("apiIntegration");

describe("fan event list handler", () => {
  it("検索条件に一致する公開済みイベントがない場合は空配列を返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/fan/event/list`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        json: {
          limit: 10,
          query: `no-such-event-${crypto.randomUUID()}`,
        },
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      json: {
        items: [],
      },
    });
  });
});
