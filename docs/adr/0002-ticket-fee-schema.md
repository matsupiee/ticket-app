# ADR 0002: チケット手数料スキーマ

## Status

Accepted

## Context

チケット販売では、購入者の支払総額に加算する購入者側手数料と、主催者への精算額から差し引く主催者側手数料が存在する。
また、手数料はシステム手数料・先行手数料・特別販売手数料のように細目が分かれる。

手数料設定を注文金額に直接埋め込むだけでは、以下を後から確認しにくい。

- 購入者に請求した手数料と、主催者精算で差し引く手数料の区別。
- 注文後に設定が変わった場合の、注文時点で適用された手数料。
- 返金・精算・問い合わせ対応で必要になる手数料内訳。

## Decision

- 手数料の設定は `FeeRule` に置く。
- `FeeRule.payer` で購入者負担の `BUYER` と主催者負担の `EVENT_ORGANIZER` を区別する。
- システム手数料・先行手数料・特別販売手数料などの細目は、まず `FeeRule.name` と `displayOrder` で表現する。
- 手数料は `rateBasisPoints` と `flatAmount` で表現する。
  - 300円固定なら `rateBasisPoints = 0` / `flatAmount = 300`。
  - 5%なら `rateBasisPoints = 500` / `flatAmount = 0`。
  - 3% + 100円なら `rateBasisPoints = 300` / `flatAmount = 100`。
- 手数料は一旦1チケットごとの扱いにする。
- パーセント手数料の端数処理は、最初は切り下げで固定する。
- `FeeRule` は `Event` に所属し、必要に応じて `SaleWindow` または `SaleOffer` に絞って適用する。
- 実際に注文へ適用された手数料は `OrderFeeLine` にスナップショットとして残す。
- `Order` には集計値として `buyerFeeAmount` と `organizerFeeAmount` を持たせる。

## Consequences

- 購入者支払額は `subtotalAmount + buyerFeeAmount` として扱える。
- 主催者精算の基礎額は `subtotalAmount - organizerFeeAmount` として扱える。
- 注文後に `FeeRule` が変更・無効化されても、過去注文の手数料明細を監査できる。
- `OrderFeeLine.amount` は、`(unitBaseAmount * rateBasisPoints / 10000 を切り下げ + flatAmount) * quantity` で計算する。
- Prisma だけでは `FeeRule` の適用範囲や金額カラムの組み合わせを完全には制約できないため、以下はアプリケーション層または将来の SQL migration で補強する。
  - `saleOfferId` がある場合、その `SaleOffer` が `saleWindowId` / `eventId` と同じスコープに属すること。
  - `saleWindowId` と `saleOfferId` を同時に指定できるかどうかの運用ルール。
  - 金額・数量・rate basis points が0以上であること。
