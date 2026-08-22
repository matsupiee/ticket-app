# ADR 0012: イベントの状態を持たず、公開期間(publishesAt / closesAt)で管理する

## Status

Accepted

## Context

主催者向けの読み取りAPI（`organizer.event.get` / `list`）は、`Event.status`（`DRAFT` / `ON_SALE` / `ENDED` / `CANCELED`）を返す前提で作られていた。しかし `Event` に status カラムは無く、実際には `SaleWindow` の公開日時・申込期間から導出していた（`getEventStatus`）。この導出には次の問題があった。

- **状態の意味が「販売の状態」と混ざっていた。** 販売受付が1件も無いだけで `DRAFT` になるため、「イベントページは公開したいが販売はまだ」「販売は終わったがページは残したい」を表現できない。
- **主催者が状態を選べなかった。** 状態は受付の日時から決まるので、イベントページをいつ出すかを直接コントロールできない。
- **`CANCELED` の判定が「全受付がキャンセル済み」だった。** 受付を1件も作っていないイベントと区別できない。

あわせて、`get` / `list` の出力スキーマ自体が現行の `schema.prisma` から大きくずれていた（ADR 0008 の積み残し）。`settlement` は対応するモデルが無く、`location` / `tags` はDBに存在しない画面モック由来の項目で、`admissionMethod` / `seatAllocationMethod` / `soldCount` などは削除済みのカラムを指していた。

## Decision

- **`Event` に `publishesAt` / `closesAt`（ともに nullable）を追加し、status カラムは持たない。** イベントページを購入者に見せる期間だけを保存し、状態はこの2つと現在時刻から導出する。
  - `publishesAt` が null → 下書き
  - `publishesAt` が未来 → 公開予定
  - `publishesAt` を過ぎていて `closesAt` が null または未来 → 公開中
  - `closesAt` を過ぎている → 公開終了
- **「買えるかどうか」は引き続き `SaleWindow` の申込期間が決める。** イベントの公開期間はページの露出だけを制御し、販売可否とは独立させる。
- **導出規則はAPIとフロントの両方に置く。** 一覧の集計（公開中イベント数）はAPI側、バッジ表示はフロント側で必要になるため、同じ規則を `list` ハンドラと `_utils/operations.ts` の `getEventPublishState` にそれぞれ実装する。判定は「公開日時 <= 現在 < 公開終了日時」に統一する。
- **`get` / `list` の出力スキーマを作り直す。** 既存スキーマは踏襲せず、画面が必要とするものだけを返す。
  - `get`: イベント詳細（ハブ）と各設定ページが復元できる粒度。公演・在庫種別・料金種別・在庫プール・販売受付・販売商品と、売上の合計。
  - `list`: 一覧の1行に出す情報（最初の公演・販売方式・売上）とダッシュボードの集計のみ。
  - `status` / `location` / `tags` / `settlement` / `admissionMethod` / `seatAllocationMethod` / `heldCount` / `soldCount` を削除した。会場と入場方式は公演と在庫種別から画面側で導出する。
- **公開期間は `create` / `editBasicInfo` から設定する。** 作成フォームの基本情報に公開日時・公開終了日時の入力欄を置く。未入力なら下書きのまま作られる。

## Consequences

- 「キャンセル」に相当する状態が無くなる。イベント全体を取りやめる場合は `closesAt` を過去にするか、販売受付を個別にキャンセルする。取りやめの理由を残す必要が出たら別途カラムを検討する。
- 売上・販売枚数は集計テーブルを持たず、注文と発券済みチケットを都度数える（`shared/event/summarize-event-sales.ts`）。イベント数・注文数が増えると一覧の表示が重くなるため、その時点で集計テーブルを検討する。
- 在庫種別の論理削除（`active`）は存在しないため、保存済みの在庫種別は画面から削除できない。未保存の行だけローカルで取り除ける。
- `fan.event.get` / `fan.event.list` は今回のスコープ外で、まだ `NOT_IMPLEMENTED` のままである。購入者側の可視性判定を実装するときは、`SaleWindow.publishesAt` だけでなく `Event.publishesAt` / `closesAt` も条件に入れる必要がある。
- 画面モック由来の固定データ（`operations.ts` の `organizerEvents` など）と、現行スキーマに追従していなかった `shared/event/organizer-event-include.ts` / `summarize-organizer-event.ts` は削除した。
