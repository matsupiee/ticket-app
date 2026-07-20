import { describe, expect, inject, it } from "vitest";

const { serverUrl } = inject("apiIntegration");

describe("platform organizer list handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/platform/organizer/list`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        json: {},
      }),
    });

    expect(response.status).toBe(401);
  });
});
