import { describe, expect, it } from "vitest";

import { formatEntryNumber } from "./format-entry-number";

describe("formatEntryNumber", () => {
  it("接頭辞がある席種は「接頭辞-番号」で表示する", () => {
    expect(formatEntryNumber({ prefix: "A", entryNumber: 1 })).toBe("A-1");
    expect(formatEntryNumber({ prefix: "S", entryNumber: 128 })).toBe("S-128");
  });

  it("接頭辞がない席種は数字だけを表示する", () => {
    expect(formatEntryNumber({ prefix: null, entryNumber: 42 })).toBe("42");
  });

  it("接頭辞が空文字の場合も数字だけを表示する", () => {
    // DB上は null を正とするが、正規化漏れで空文字が来ても券面の表示を壊さない
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
