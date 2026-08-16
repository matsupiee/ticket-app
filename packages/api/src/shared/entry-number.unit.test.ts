import { describe, expect, it } from "vitest";

import { ENTRY_NUMBER_PREFIX_PATTERN, formatEntryNumber } from "./entry-number";

describe("formatEntryNumber", () => {
  it("接頭辞がある席種は「接頭辞-番号」で表示する", () => {
    expect(formatEntryNumber({ prefix: "A", entryNumber: 1 })).toBe("A-1");
    expect(formatEntryNumber({ prefix: "S", entryNumber: 128 })).toBe("S-128");
  });

  it("接頭辞がない席種は数字だけを表示する", () => {
    expect(formatEntryNumber({ prefix: null, entryNumber: 42 })).toBe("42");
  });

  it("接頭辞が空文字の場合も数字だけを表示する", () => {
    // DB上は null を正とするが、フォームからの空入力が素通りしても壊れないようにする
    expect(formatEntryNumber({ prefix: "", entryNumber: 42 })).toBe("42");
  });

  it("未採番の在庫枠は表示する整理番号がないので null を返す", () => {
    expect(formatEntryNumber({ prefix: "A", entryNumber: null })).toBeNull();
    expect(formatEntryNumber({ prefix: null, entryNumber: null })).toBeNull();
  });

  it("番号は0埋めしない", () => {
    expect(formatEntryNumber({ prefix: "A", entryNumber: 7 })).toBe("A-7");
  });
});

describe("ENTRY_NUMBER_PREFIX_PATTERN", () => {
  it("半角英数字の大文字1〜4文字を許可する", () => {
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("A")).toBe(true);
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("VIP")).toBe(true);
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("SS01")).toBe(true);
  });

  it("小文字・全角・記号・空文字・5文字以上は許可しない", () => {
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("a")).toBe(false);
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("Ｓ")).toBe(false);
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("S席")).toBe(false);
    // 区切り文字は表示時に付けるので接頭辞には含められない
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("S-")).toBe(false);
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("")).toBe(false);
    expect(ENTRY_NUMBER_PREFIX_PATTERN.test("VIPSS")).toBe(false);
  });
});
