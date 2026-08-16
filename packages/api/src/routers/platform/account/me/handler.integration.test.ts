import { db } from "@ticket-app/db";
import { describe, expect, inject, it } from "vitest";

const { serverUrl } = inject("apiIntegration");

describe("platform account me handler", () => {
  it("未ログインの場合はUNAUTHORIZEDを返す", async () => {
    const response = await fetch(`${serverUrl}/rpc/platform/account/me`, {
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

  it("ログイン済みでもPlatformMemberに登録されていない場合はFORBIDDENを返す", async () => {
    const signUpResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "権限なし ユーザー",
        email: `platform-account-me-${Date.now()}@example.com`,
        password: "platform-integration-password",
      }),
    });

    expect(signUpResponse.ok).toBe(true);

    // better-auth はセッションcookieを1つだけ返すため、先頭の name=value だけを取り出す
    const cookie = (signUpResponse.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

    const response = await fetch(`${serverUrl}/rpc/platform/account/me`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        json: {},
      }),
    });

    expect(response.status).toBe(403);
  });

  it("PlatformMemberに登録済みの場合は自分のアカウント情報とロールを返す", async () => {
    const email = `platform-account-me-${Date.now()}@example.com`;
    const signUpResponse = await fetch(`${serverUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "運営 太郎",
        email,
        password: "platform-integration-password",
      }),
    });

    expect(signUpResponse.ok).toBe(true);

    const { user } = (await signUpResponse.json()) as { user: { id: string } };

    await db.platformMember.create({
      data: {
        userId: user.id,
        role: "EDITOR",
      },
    });

    // better-auth はセッションcookieを1つだけ返すため、先頭の name=value だけを取り出す
    const cookie = (signUpResponse.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

    const response = await fetch(`${serverUrl}/rpc/platform/account/me`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        json: {},
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      json: {
        userId: user.id,
        name: "運営 太郎",
        email,
        role: "EDITOR",
      },
    });
  });
});
