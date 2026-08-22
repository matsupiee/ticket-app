import { describe, expect, it } from "vitest";

import { getEventPublishState } from "./operations";

describe("getEventPublishState", () => {
  const now = new Date("2026-08-01T00:00:00.000Z");

  it("公開日時が未設定なら下書きになる", () => {
    expect(getEventPublishState({ publishesAt: null, closesAt: null }, now)).toBe("DRAFT");
    // 公開終了日だけ入っていても、公開日時が無ければ下書きのまま
    expect(
      getEventPublishState({ publishesAt: null, closesAt: "2026-09-01T00:00:00.000Z" }, now),
    ).toBe("DRAFT");
  });

  it("公開日時が未来なら公開予定になる", () => {
    expect(
      getEventPublishState({ publishesAt: "2026-08-01T00:00:00.001Z", closesAt: null }, now),
    ).toBe("SCHEDULED");
  });

  it("公開日時を過ぎていて公開終了日が未設定なら公開中になる", () => {
    expect(
      getEventPublishState({ publishesAt: "2026-08-01T00:00:00.000Z", closesAt: null }, now),
    ).toBe("PUBLISHED");
  });

  it("公開終了日を過ぎていれば公開終了になる", () => {
    expect(
      getEventPublishState(
        { publishesAt: "2026-07-01T00:00:00.000Z", closesAt: "2026-08-01T00:00:00.000Z" },
        now,
      ),
    ).toBe("CLOSED");
    // 公開終了日ちょうどは終了扱いにし、その1ミリ秒前は公開中のままにする
    expect(
      getEventPublishState(
        { publishesAt: "2026-07-01T00:00:00.000Z", closesAt: "2026-08-01T00:00:00.001Z" },
        now,
      ),
    ).toBe("PUBLISHED");
  });
});
