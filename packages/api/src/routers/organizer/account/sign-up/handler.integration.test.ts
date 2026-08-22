import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

const { origin, serverUrl } = inject("apiIntegration");

describe("organizer account sign-up handler", () => {
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

  it("主催者・精算先の会社・EDITORの所属を作成する", async () => {
    const suffix = crypto.randomUUID();
    const email = `organizer-created-${suffix}@example.com`;
    const authResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        email,
        password: "Password123!",
        name: "Organizer Created",
      }),
    });

    expect(authResponse.status).toBe(200);

    const organizerName = `Organizer Created ${suffix}`;
    const signUpResponse = await fetch(`${serverUrl}/rpc/organizer/account/signUp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: getCookieHeader(authResponse),
        origin,
      },
      body: JSON.stringify({
        json: {
          organizerName,
        },
      }),
    });

    expect(signUpResponse.status).toBe(200);

    const organizer = await db.organizer.findUniqueOrThrow({
      where: { name: organizerName },
      include: { company: true, organizerMembers: true },
    });
    const user = await db.user.findUniqueOrThrow({ where: { email } });

    expect(organizer.inquiryEmail).toBe(email);
    expect(organizer.company.name).toBe(`${organizerName} 運営会社`);
    expect(organizer.organizerMembers).toHaveLength(1);
    expect(organizer.organizerMembers[0]).toMatchObject({
      userId: user.id,
      role: "EDITOR",
    });
  });

  it("すでに主催者に所属している場合は、主催者を増やさず既存の主催者を返す", async () => {
    const suffix = crypto.randomUUID();
    const authResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        email: `organizer-existing-${suffix}@example.com`,
        password: "Password123!",
        name: "Organizer Existing",
      }),
    });

    expect(authResponse.status).toBe(200);

    const cookie = getCookieHeader(authResponse);
    const organizerName = `Organizer Existing ${suffix}`;
    const firstResponse = await fetch(`${serverUrl}/rpc/organizer/account/signUp`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, origin },
      body: JSON.stringify({ json: { organizerName } }),
    });

    expect(firstResponse.status).toBe(200);

    const secondResponse = await fetch(`${serverUrl}/rpc/organizer/account/signUp`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, origin },
      body: JSON.stringify({ json: { organizerName: `別の主催者名 ${suffix}` } }),
    });

    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      json: {
        name: organizerName,
        role: "EDITOR",
      },
    });
    await expect(
      db.organizer.findUnique({ where: { name: `別の主催者名 ${suffix}` } }),
    ).resolves.toBeNull();
  });

  it("他のユーザーが使っている主催者名の場合はCONFLICTを返す", async () => {
    const suffix = crypto.randomUUID();
    const organizerName = `Organizer Duplicated ${suffix}`;
    const company = await db.company.create({ data: { name: `既存の会社 ${suffix}` } });
    await db.organizer.create({ data: { name: organizerName, companyId: company.id } });

    const authResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        email: `organizer-duplicated-${suffix}@example.com`,
        password: "Password123!",
        name: "Organizer Duplicated",
      }),
    });

    expect(authResponse.status).toBe(200);

    const signUpResponse = await fetch(`${serverUrl}/rpc/organizer/account/signUp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: getCookieHeader(authResponse),
        origin,
      },
      body: JSON.stringify({
        json: { organizerName },
      }),
    });

    expect(signUpResponse.status).toBe(409);
  });

  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/organizer/account/signUp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        json: { organizerName: `未ログイン主催者 ${crypto.randomUUID()}` },
      }),
    });

    expect(response.status).toBe(401);
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
