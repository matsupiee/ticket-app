// 整理番号の接頭辞に使える文字。設計の前提は ADR 0008 を参照。
//
// 券面の可読性と入場列での読み上げやすさを優先し、半角英数字の大文字だけに限定する。
// 先頭は英字に限る。「1-1」のような数字だけの接頭辞は整理番号と紛らわしく読み上げにくいため。
// 区切り文字「-」は表示時に付けるので接頭辞自体には含めない。
const ENTRY_NUMBER_PREFIX_PATTERN = /^[A-Z][A-Z0-9]{0,3}$/;

/**
 * 整理番号の接頭辞として保存してよい文字列かどうかを判定する。
 *
 * 「接頭辞なし」は `null` で表すため、空文字はここでは許可しない。
 * API層の入力では空文字を `null` に正規化したうえで、値がある場合だけこの判定にかける。
 */
export function isValidEntryNumberPrefix(prefix: string): boolean {
  return ENTRY_NUMBER_PREFIX_PATTERN.test(prefix);
}
