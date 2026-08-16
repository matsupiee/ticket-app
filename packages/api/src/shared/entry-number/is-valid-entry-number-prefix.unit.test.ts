import { describe, expect, it } from "vitest";

import { isValidEntryNumberPrefix } from "./is-valid-entry-number-prefix";

describe("isValidEntryNumberPrefix", () => {
  it("英字で始まる半角英数字の大文字1〜4文字を許可する", () => {
    expect(isValidEntryNumberPrefix("A")).toBe(true);
    expect(isValidEntryNumberPrefix("VIP")).toBe(true);
    expect(isValidEntryNumberPrefix("SS01")).toBe(true);
  });

  it("数字で始まる接頭辞は許可しない", () => {
    // 「1-1」は整理番号と紛らわしく、入場列で読み上げにくい
    expect(isValidEntryNumberPrefix("1")).toBe(false);
    expect(isValidEntryNumberPrefix("0000")).toBe(false);
  });

  it("小文字・全角・記号・5文字以上は許可しない", () => {
    expect(isValidEntryNumberPrefix("a")).toBe(false);
    expect(isValidEntryNumberPrefix("Ｓ")).toBe(false);
    expect(isValidEntryNumberPrefix("S席")).toBe(false);
    // 区切り文字は表示時に付けるので接頭辞には含められない
    expect(isValidEntryNumberPrefix("S-")).toBe(false);
    expect(isValidEntryNumberPrefix("VIPSS")).toBe(false);
  });

  it("「接頭辞なし」は null で表すため空文字は許可しない", () => {
    expect(isValidEntryNumberPrefix("")).toBe(false);
  });
});
