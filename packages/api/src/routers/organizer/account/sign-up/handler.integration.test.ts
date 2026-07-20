import { describe, expect, inject, it } from "vitest";

const { origin, serverUrl } = inject("apiIntegration");

describe("signUpOrganizerAccountHandler", () => {
  it("Cloud Run形式のAPIサーバーでlocalhost:3002から主催者新規登録でき、CORSヘッダーを返す", async () => {
    const suffix = crypto.randomUUID();
    const email = `organizer-${suffix}@example.com`;
    const authResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        email,
        password: "Password123!",
        name: "Organizer Integration",
      }),
    });

    expect(authResponse.status).toBe(200);
    expect(authResponse.headers.get("access-control-allow-origin")).toBe(origin);

    const cookie = getCookieHeader(authResponse);
    const organizerName = `Organizer Integration ${suffix}`;
    const signUpResponse = await fetch(`${serverUrl}/rpc/organizer/account/signUp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        origin,
      },
      body: JSON.stringify({
        json: {
          organizerName,
        },
      }),
    });

    expect(signUpResponse.status).toBe(200);
    expect(signUpResponse.headers.get("access-control-allow-origin")).toBe(origin);
    await expect(signUpResponse.json()).resolves.toMatchObject({
      json: {
        eventOrganizerId: expect.any(String),
        name: organizerName,
        role: "EDITOR",
      },
    });

    const meResponse = await fetch(
      `${serverUrl}/rpc/organizer/account/me?data=${encodeURIComponent(
        JSON.stringify({ json: {} }),
      )}`,
      {
        headers: {
          cookie,
          origin,
        },
      },
    );

    expect(meResponse.status).toBe(200);
    expect(meResponse.headers.get("access-control-allow-origin")).toBe(origin);
    await expect(meResponse.json()).resolves.toMatchObject({
      json: {
        name: organizerName,
        role: "EDITOR",
      },
    });
  });
});

function getCookieHeader(response: Response) {
  const headersWithCookies = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    headersWithCookies.getSetCookie?.() ??
    response.headers
      .get("set-cookie")
      ?.split(/,(?=\s*better-auth\.)/)
      .map((cookie) => cookie.trim()) ??
    [];

  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
