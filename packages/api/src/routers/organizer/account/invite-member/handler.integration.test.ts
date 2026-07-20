import { describe, expect, inject, it } from "vitest";

const { serverUrl } = inject("apiIntegration");

describe("organizer account invite-member handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/account/inviteMember`, {
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
