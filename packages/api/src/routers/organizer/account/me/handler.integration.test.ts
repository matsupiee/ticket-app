import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

const { origin, serverUrl } = inject("apiIntegration");

describe("organizer account me handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/account/me`, {
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

  it("主催者に所属していないユーザーの場合はFORBIDDENを返す", async () => {
    const suffix = crypto.randomUUID();
    const authResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        email: `organizer-me-forbidden-${suffix}@example.com`,
        password: "Password123!",
        name: "Organizer Me Forbidden",
      }),
    });

    expect(authResponse.status).toBe(200);

    const response = await fetch(`${serverUrl}/rpc/organizer/account/me`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: getCookieHeader(authResponse),
        origin,
      },
      body: JSON.stringify({
        json: {},
      }),
    });

    expect(response.status).toBe(403);
  });

  it("複数の主催者に所属している場合は、最初に所属した主催者を返す", async () => {
    const suffix = crypto.randomUUID();
    const authResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        email: `organizer-me-multi-${suffix}@example.com`,
        password: "Password123!",
        name: "Organizer Me Multi",
      }),
    });

    expect(authResponse.status).toBe(200);

    const user = await db.user.findUniqueOrThrow({
      where: { email: `organizer-me-multi-${suffix}@example.com` },
    });
    const firstCompany = await db.company.create({
      data: { name: `最初の会社 ${suffix}` },
    });
    const firstOrganizer = await db.organizer.create({
      data: { name: `最初の主催者 ${suffix}`, companyId: firstCompany.id },
    });
    await db.organizerMember.create({
      data: { userId: user.id, organizerId: firstOrganizer.id, role: "EDITOR" },
    });

    const secondCompany = await db.company.create({
      data: { name: `2番目の会社 ${suffix}` },
    });
    const secondOrganizer = await db.organizer.create({
      data: { name: `2番目の主催者 ${suffix}`, companyId: secondCompany.id },
    });
    await db.organizerMember.create({
      data: { userId: user.id, organizerId: secondOrganizer.id, role: "VIEWER" },
    });

    const response = await fetch(`${serverUrl}/rpc/organizer/account/me`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: getCookieHeader(authResponse),
        origin,
      },
      body: JSON.stringify({
        json: {},
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      json: {
        eventOrganizerId: firstOrganizer.id,
        name: `最初の主催者 ${suffix}`,
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
