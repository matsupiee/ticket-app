import { describe, expect, inject, it } from "vitest";

const { serverUrl } = inject("apiIntegration");

describe("fan event get handler", () => {
  it("存在しないイベントIDの場合はNOT_FOUNDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/fan/event/get`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        json: {
          eventId: crypto.randomUUID(),
        },
      }),
    });

    expect(response.status).toBe(404);
  });
});
