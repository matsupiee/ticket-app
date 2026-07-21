# ADR 0004: イベント編集をステップ単位の粒度の細かいupsert APIで構成する

## Status

Accepted

## Context

`organizer.event.create` / `update` は、1公演・1席種・1料金種別・1販売受付・1販売商品という単一構成の `publicTicketing` を丸ごと作成・更新するモノリシックなAPIである。`docs/requirement.md` は「次に進める場合は複数公演・複数席種・複数料金種別に広げる」ことを既定路線として明記しており、単一構成前提のcreate/updateではこの拡張を表現できない。

イベント作成・編集ページを、公演・席種・料金種別・在庫・販売受付・販売商品をステップごとに設定するウィザードUIに置き換えるにあたり、各ステップを個別に保存できるAPIが必要になった。`packages/db/prisma/schema.prisma` のドメインモデル（`docs/adr/0001-ticket-domain-schema.md` 参照）は元々この粒度をサポートしており、対応する `upsert-performance` / `upsert-seat-category` / `upsert-rate-type` / `upsert-sale-window` / `upsert-sale-offer` / `adjust-inventory` / `cancel-sale-window` の7ルートはスキーマ定義のみ用意されていたが、`handler.ts` は `NOT_IMPLEMENTED` のスタブのままだった。

既存の `update` のように「配列をまるごと差し替える」設計も検討したが、`SaleOfferRate` は実注文（`OrderItem`）や抽選応募明細（`ApplicationPreferenceItem`）から、`SaleOfferEntitlement` は発券済みチケット（`TicketEntitlement`）から参照されるため、単純な全削除・全再作成は実データの参照整合性を壊す。そのため `upsertSaleOffer` は、クライアントから送られた `rates[]` / `entitlements[]` をその時点の完全な目的状態とみなし、既存DBレコードとの差分（作成・更新・削除）を計算する設計にした。

編集画面では、公演・席種一覧やオファーごとの料金・対象公演といった生データをそのまま復元する必要がある。編集専用の新しい読み取りAPIを新設する案も検討したが、`docs/coding-pattern/backend.md` が定める「同じ役割のAPIの重複を避ける」に反し、既存の `organizer.event.get` とほぼ同じ権限チェック・Prismaクエリを重複保守することになるため採用しなかった。既存の `get` の出力を拡張する方針とした。

## Decision

- イベント編集APIを、単一のcreate/update APIに加えて、リソースの粒度ごとに分かれた `upsert-*` / `adjust-*` / `cancel-*` APIの集合として提供する。既存の `create` / `update`（`publicTicketing` 丸ごと版）は単発イベントの即時作成という別用途のために残し、廃止しない。
- 各 `upsert-*` は、対象IDが入力にあれば更新、なければ作成という統一されたupsertセマンティクスを持つ。`upsertSeatCategory` / `upsertRateType` は `@@unique([eventId, name])` の名前衝突を `CONFLICT` として扱う。
- `upsertSaleOffer` の `rates[]` / `entitlements[]` は差分反映し、実注文・応募・発券済みチケットから参照されている行の削除は `BAD_REQUEST` で拒否する。
- 在庫の増減は `adjustInventory`（実体は `shared/inventory/adjust-inventory-capacity.ts`）が専任する。`InventoryUnit` は `status: "AVAILABLE"` のものだけを削除対象にし、`HELD` / `SOLD` は絶対に削除しない。指定席（`RESERVED_SEAT`）は座席レイアウトの選択UIが今回のデザインに存在しないため、増減どちらも非対応（`BAD_REQUEST`）とする。
- `Venue` はEventに紐付かないグローバルなテーブルのため、`upsertPerformance` へ `venueId` が渡された場合は「このイベント内の他の公演が既に使っている会場か」だけを確認して紐付け、`name` の書き換えは行わない。他主催者のVenueデータを汚染しないためである。`venueId` を省略した場合は同一イベント内で同名Venueを再利用し、無ければ新規作成する。
- `organizer.event.get` の出力に、`seatCategories` / `rateTypes`（ともにid付き）、`inventoryPools`、`performances[].venueId` / `seatLayoutId`、`saleWindows[]` の公開日時・SMS認証要否・抽選設定・キャンセル情報、`saleWindows[].offers[]` の `rates` / `entitlements` を追加する。既存フィールドは変更しない（破壊的変更なし）。`get` と `list` で重複していた集計ロジック（`organizerEventInclude` / `toOrganizerEventSummary` とその内部ヘルパー）は `shared/event/organizer-event-include.ts` / `shared/event/summarize-organizer-event.ts` に切り出し、両ハンドラから共通利用する。`list` の出力スキーマは変更しないため、追加フィールドはzodのデフォルト挙動（未定義キーの除去）によりレスポンスから自動的に除かれる。
- 出演アーティスト機能（`Artist` / `PerformanceArtist`）は今回のスコープに含めない。`upsertPerformance` の入力スキーマに関連フィールドが無く、`Venue` と同様に主催者非依存のグローバルテーブルであるため、名寄せ規則を含めて別途設計する。
- `Performance` / `RateType` / `SaleOffer` の保存済み行を完全に削除する手段は今回追加しない。論理削除カラム（`SeatCategory.active`、`SaleWindow.canceledAt`）が既にある `SeatCategory` と `SaleWindow` のみ、それぞれ `upsertSeatCategory` の `active: false` と `cancelSaleWindow` で無効化できる。

## Consequences

- `routers/organizer/event/` 配下のAPI数が増え、用途の異なるcreate/updateとupsert-\*系が並存する。ウィザードのステップ順は、`upsertSaleOffer` の `entitlements` が `InventoryPool` の存在を要求するという参照整合性によって「公演→席種→料金種別→在庫→販売受付→販売商品」の順に事実上固定される。
- ウィザードUIは、`Performance` / `RateType` / `SaleOffer` の保存済み行に対する削除UIを提供できない（未保存のローカル行のみ削除可能）。将来これらの削除に対応する場合は、依存データがゼロであることの確認を伴う `delete-*` エンドポイントの追加、または論理削除カラムの追加を別ADRで検討する。
- `adjustInventory` の `reason` を保存する監査ログ用のカラムがスキーマに無いため、現状は構造化ログへの出力のみで、DB上での監査はできない。将来必要になれば別ADRで監査テーブルを検討する。
- `upsertSaleWindow` の `publishesAt` を省略すると即座に「公開済み」（`fan.event.list` などの可視性判定で `publishesAt IS NULL` は公開済み扱い）になる。ウィザードのフロントエンドは、意図せず一般公開されないよう入力を必須にするかデフォルト値を設けるかを検討する必要がある。
