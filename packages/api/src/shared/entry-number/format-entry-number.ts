// 整理番号の表示形式。設計の前提は ADR 0005 / ADR 0008 を参照。要点は次のとおり。
//   - 整理番号(InventorySlot.entryNumber)は InventoryPool（公演 × 席種）単位の連番
//   - 接頭辞は TicketCategory.entryNumberPrefix が持つ。同じ公演で「A-1」と「S-1」を見分けるためのもの
//   - 「A-1」という整形済みの文字列はDBに保存しない。表示のたびにこの関数で組み立てる
//     券面・保有チケット一覧・主催者管理画面・もぎりで表記がずれないよう、組み立ては必ずここに集約する

const ENTRY_NUMBER_SEPARATOR = "-";

type FormatEntryNumberInput = {
  // TicketCategory.entryNumberPrefix。接頭辞なしの席種では null
  // DBには空文字を保存せず、API層の入力で空文字は null に正規化する（ADR 0008）
  prefix: string | null;
  // InventorySlot.entryNumber。注文に割り当てるまでは未採番なので null
  entryNumber: number | null;
};

/**
 * 整理番号の表示文字列を組み立てる。
 *
 * 未採番（entryNumber が null）の場合は表示するものが無いため null を返す。
 * 接頭辞が無い席種は従来どおり数字だけを返す。
 */
export function formatEntryNumber({ prefix, entryNumber }: FormatEntryNumberInput): string | null {
  if (entryNumber === null) {
    return null;
  }

  // 空文字は正規化漏れだが、券面の表示を壊すより接頭辞なしとして扱う方が害が小さい
  if (prefix === null || prefix === "") {
    return String(entryNumber);
  }

  return `${prefix}${ENTRY_NUMBER_SEPARATOR}${entryNumber}`;
}
