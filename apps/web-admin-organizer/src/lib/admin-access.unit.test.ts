import { describe, expect, it } from "vitest";

import { isAllowedAdminEmail, parseAllowedEmails } from "./admin-access";

describe("organizer admin access", () => {
  it("カンマ区切りの許可メールを正規化して判定する", () => {
    const allowedEmails = parseAllowedEmails(" Organizer@Example.com, staff@example.com ", []);

    expect(isAllowedAdminEmail("organizer@example.com", allowedEmails)).toBe(true);
    expect(isAllowedAdminEmail("customer@example.com", allowedEmails)).toBe(false);
  });

  it("許可メールが未設定のときはfallbackを使う", () => {
    expect(parseAllowedEmails(undefined, ["organizer@example.com"])).toEqual([
      "organizer@example.com",
    ]);
  });
});
