化け物テーブルを作らないようにする。
一方で、細かくテーブルを分割しすぎてパフォーマンスが落ちたり理解が難しくなったりするのも防ぐ

以下の順番で各テーブルを定義する

```
// 主キー,createdAt,updatedAt は各テーブルの一番上
id        String   @id @default(uuid())
createdAt DateTime @default(now())
updatedAt DateTime @default(now()) @updatedAt

// 次に他テーブルとのリレーションを貼るカラム
userId    String

// 他のカラム
price Int

// 他テーブルに自分からリレーションを貼るものを定義
user User @relation("OrderUser", fields: [userId], references: [id])

// テーブルからリレーションを貼られているものを定義
orderItems OrderItem[]
```

リレーションを定義する際、元のmodel名を短縮せずにそのまま書くようにする

```
ダメな例
offerRates SaleOfferRate[]

いい例
saleOfferRates SaleOfferRate[]
```

複合リレーションをむやみに貼らない。重要なものだけに限る
