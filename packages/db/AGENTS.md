# データベース設計ルール

## テーブル分割の方針

1つのテーブルに責務やカラムを詰め込みすぎた、いわゆる「化け物テーブル」を作らない。

一方で、正規化を優先して細かく分割しすぎると、次の問題が起こる。

- JOINや追加クエリが増え、パフォーマンスが低下する
- データ構造の全体像を把握しづらくなる
- 更新処理やトランザクションが複雑になる

テーブルを分割する際は、責務の分離だけでなく、取得方法・更新単位・運用上の理解しやすさも考慮する。

## Model内の定義順

各Modelのフィールドは、原則として次の順番で定義する。

```prisma
model Order {
  // 1. 主キー・作成日時・更新日時
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  // 2. 他Modelを参照する外部キー
  userId String

  // 3. その他のフィールド
  price Int

  // 4. このModelから他Modelを参照するリレーション
  user User @relation("OrderUser", fields: [userId], references: [id])

  // 5. 他ModelからこのModelを参照するリレーション
  orderItems OrderItem[]
}
```

次の順番を統一することで、Modelの構造を上から読んだだけで把握できるようにする。

1. `id`
2. `createdAt`
3. `updatedAt`
4. 外部キー
5. その他のフィールド
6. 自分から参照するリレーション
7. 他Modelから参照されるリレーション

## リレーションフィールドの命名

リレーションフィールド名では、参照先のModel名を不必要に省略しない。

```prisma
// 悪い例
offerRates SaleOfferRate[]

// 良い例
saleOfferRates SaleOfferRate[]
```

フィールド名だけで参照先のModelを推測できる名前にする。

## 複合リレーション

複数カラムを使用したリレーションは、必要性が明確な場合にのみ定義する。
複合リレーションを定義する場合は、少なくとも次の点を確認する。

- データの整合性をデータベースで保証する必要がある
- 一意性や所属関係を複数カラムで表現する必要がある
- 単一のIDによるリレーションでは要件を満たせない
- クエリや更新処理が過度に複雑にならない

重要でない関連は、アプリケーション側の検証に任せる

## Prisma Clientのライフサイクル

APIサーバーはCloud RunのNode.js互換コンテナで動かす。
Prisma Clientは `packages/db/src/index.ts` のmodule-level singletonに集約し、handlerやauth実装で `new PrismaClient()` や `pg` / `postgres` を直接使わない。

DBアクセス方針を変える場合は、先に `docs/adr/` と `docs/coding-pattern/backend.md` を更新する。
