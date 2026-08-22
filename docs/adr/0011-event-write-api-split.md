# ADR 0011: 主催者イベントの書き込みAPIを create / editBasicInfo / editSalesSetting に再編する

## Status

Accepted（ADR 0004 の粒度と ADR 0008 のAPI棚卸し結果を置き換える）

## Context

ADR 0004 は、イベント編集ウィザードのステップに合わせて書き込みAPIをリソース単位（`upsertPerformance` / `upsertSeatCategory` / `upsertRateType` / `adjustInventory` / `upsertSaleWindow` / `upsertSaleOffer` / `cancelSaleWindow` と `update`）に分割した。ステップごとに保存できることが要件だったためである。

ADR 0010 で画面構成が変わり、この前提が崩れた。イベント作成は「基本情報と公演」で一区切りになり、残りはイベント詳細をハブにした設定ページで編集する。つまり保存の単位は「ステップ」ではなく「画面が担当する設定のまとまり」になった。

粒度の細かいAPIをそのまま使うと、次の問題が残る。

- **呼び出し順の責務がクライアントに残る。** 販売商品は在庫プールの存在を前提にするため、フロントが「在庫種別 → 在庫 → 料金種別 → 販売受付 → 販売商品」の順に複数回APIを呼ぶ必要がある。ADR 0008 の Consequences にも同じ懸念が書かれている。
- **途中失敗で中途半端な状態が残る。** 保存が複数回のリクエストに分かれるため、3本目で失敗すると1〜2本目だけ反映された状態になる。トランザクション境界がクライアント側にしか無い。
- **未保存データの相互参照をクライアントが解決している。** 新規の在庫種別・料金種別はまだIDを持たないため、フロントがローカルkeyと採番後IDの対応表を持ち回っていた。

なお、再編の着手時点では `organizer/event` 配下のハンドラは全て `NOT_IMPLEMENTED` のスタブだった（ADR 0007 の書き直し待ち）ため、再編による実装の破棄は発生していない。書き込み3本は同じPRで実装した。

## Decision

- 主催者イベントの書き込みAPIを、画面の担当範囲に合わせて3本にする。
  - `event.create`: イベントの基本情報と公演をまとめて作成する。公演は0件でもよい。
  - `event.editBasicInfo`: 基本情報と公演を編集する。
  - `event.editSalesSetting`: 在庫種別・在庫・料金種別・販売受付・販売商品をまとめて編集する。
- `update` / `upsert-*` / `adjust-inventory` / `cancel-sale-window` の8本を削除する。読み取りの `get` / `list` は変更しない。
- `editSalesSetting` は送られた内容をその時点の完全な目的状態として扱う。未保存の在庫種別・料金種別はIDを持たないため、クライアントが決めた `key` で在庫・販売商品から相互参照し、サーバー側で実IDへ解決する。既存行は `id` を併せて送る。
- 販売受付のキャンセルは `editSalesSetting` の `cancelReason` で表す。専用APIは持たない。
- 公演の呼称を `Stage` に統一する。DBは元々 `Stage` で、API層とフロントだけが `Performance` を使っていた（ADR 0008 の積み残し）。
- 在庫種別の呼称を `InventoryCategory` に統一する。DBは ADR 0009 で改名済みで、API層とフロントだけが `seatCategory` を使っていた。日本語の表示ラベルは「席種」のまま残す（ADR 0009 のとおり「在庫種別」は主催者向けの語として不自然なため）。
- フロントのフックは画面ごとに分ける。`(form)/_hooks/use-create-event.ts` が `create` / `editBasicInfo` を、`_hooks/use-edit-sales-setting.ts` が `editSalesSetting` を担当する。ドラフトの状態遷移（reducer）と入力生成（`_utils/build-sales-setting-input.ts`）は純粋関数として共有する。

## Consequences

- 1回の保存が1リクエストになり、サーバー側でトランザクションを張れる。呼び出し順の責務もサーバーに移る。
- `editSalesSetting` の入力は大きくなる。設定ページのどれから保存しても販売設定の全体を送るため、ある画面での編集が他の画面の設定を上書きしうる。編集の衝突（同じイベントを2人が同時に編集する等）は現状どのAPIでも検出していないため、必要になった時点で `updatedAt` によるオプティミスティックロックを別途検討する。
- 部分更新ができないため、たとえば「料金種別の名前だけ変えたい」場合も販売設定全体が送られる。差分計算はサーバー側の責務になる。
- 3本のハンドラを実装した。読み取りの `get` / `list` は引き続き `NOT_IMPLEMENTED` のままなので、画面としてはまだ通しで動かない。
- 在庫の共通処理 `shared/inventory/adjust-inventory-capacity.ts` は、差分(`capacityDelta`)ではなく目的の枚数(`capacity`)を受け取る形へ変更した。あわせて現行スキーマ（`InventorySlot` / 整理番号は注文時採番）へ追従させた。
- 削除の扱いは対象ごとに異なる。在庫種別・料金種別・販売受付・販売商品は、入力に含まれない既存行を消さない（実データから参照されうるため）。販売商品の料金と利用権だけは入力を目的状態として差分反映し、`ApplicationItem` から参照されている料金の削除は `BAD_REQUEST` で拒否する。
- 保存は1トランザクションなので、途中で失敗すればその保存全体が巻き戻る。
- 自動抽選の開始日時（`autoLotteryStartsAt`）はUIに入力欄が無いため、フロントは「抽選方式=自動」のとき申込終了日時を送る。専用の入力欄が必要になったら見直す。
