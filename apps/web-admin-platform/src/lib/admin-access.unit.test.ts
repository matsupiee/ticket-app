import { describe, expect, it } from "vitest";

import { isAllowedAdminEmail, parseAllowedEmails } from "./admin-access";

describe("platform admin access", () => {
  it("カンマ区切りの許可メールを正規化して判定する", () => {
    const allowedEmails = parseAllowedEmails(" Platform@Example.com, ops@example.com ", []);

    expect(isAllowedAdminEmail("platform@example.com", allowedEmails)).toBe(true);
    expect(isAllowedAdminEmail("organizer@example.com", allowedEmails)).toBe(false);
  });

  it("許可メールが未設定のときはfallbackを使う", () => {
    expect(parseAllowedEmails(undefined, ["platform@example.com"])).toEqual([
      "platform@example.com",
    ]);
  });

  it("@始まりの設定はドメイン一致で判定する", () => {
    const allowedEmails = parseAllowedEmails("@Platform.example.com", []);

    expect(isAllowedAdminEmail("ops@platform.example.com", allowedEmails)).toBe(true);
    expect(isAllowedAdminEmail("ops@other.example.com", allowedEmails)).toBe(false);
    expect(isAllowedAdminEmail("ops@sub.platform.example.com", allowedEmails)).toBe(false);
  });

  it("メールアドレスとして成立しない値は許可しない", () => {
    const allowedEmails = parseAllowedEmails("@example.com,platform@example.com", []);

    expect(isAllowedAdminEmail("", allowedEmails)).toBe(false);
    expect(isAllowedAdminEmail(null, allowedEmails)).toBe(false);
    expect(isAllowedAdminEmail("platform", allowedEmails)).toBe(false);
    expect(isAllowedAdminEmail("@example.com", allowedEmails)).toBe(false);
    expect(isAllowedAdminEmail("platform@", allowedEmails)).toBe(false);
  });
});
