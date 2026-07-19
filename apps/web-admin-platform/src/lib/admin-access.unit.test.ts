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
});
