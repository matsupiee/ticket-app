# API実装ルール

以下のルールに従ってAPIを実装すること。

## ディレクトリ構成

### 基本方針

権限管理を単純かつ安全にするため、APIルートを利用者の種別ごとに完全に分離する。

```txt
.
├── routers
│   ├── index.ts
│   ├── fan            # 一般ユーザー向けAPI
│   ├── organizer      # イベント主催者向けAPI
│   └── platform       # プラットフォーム管理者向けAPI
├── shared             # 複数のAPIで共通して使用する重要なドメインロジック
└── third-party-lib    # DB・決済・メール送信などの外部サービスクライアント
```

利用者種別ごとにルートを分離することで、認証・認可の設定漏れを防ぎ、各APIが誰のためのものかを明確にする。

## APIルートの構成

1つのAPIルートにつき、1つのディレクトリを作成する。

各APIディレクトリに置けるファイルは、原則として次の3ファイルのみとする。

```txt
route.ts
handler.ts
handler.integration.test.ts
```

それぞれの責務は次のとおり。

- `route.ts`

  - HTTPメソッドやパスの定義
  - procedureの選択
  - input / output schemaの定義
  - APIエラーの定義
  - handlerの登録

- `handler.ts`

  - APIの具体的な処理
  - DBアクセス
  - APIレスポンスへの変換

- `handler.integration.test.ts`

  - handlerの統合テスト

### 構成例

```txt
.
└── routers/
    ├── index.ts
    └── fan/
        ├── index.ts
        ├── application/
        │   └── submit/
        │       ├── route.ts
        │       ├── handler.ts
        │       └── handler.integration.test.ts
        └── event/
            └── list/
                ├── route.ts
                ├── handler.ts
                └── handler.integration.test.ts
```

## `index.ts`の配置

`index.ts`を置ける場所は、次の箇所に限定する。

```txt
packages/api/src/routers/index.ts
packages/api/src/routers/fan/index.ts
packages/api/src/routers/organizer/index.ts
packages/api/src/routers/platform/index.ts
```

各利用者種別の`index.ts`では、その配下にあるすべてのAPIルートを集約する。

中間ディレクトリや各APIディレクトリには`index.ts`を置かない。

```txt
# 置かない例
routers/fan/event/index.ts
routers/fan/event/get/index.ts
```

不要なre-exportを避け、import元と実装ファイルの対応を明確にするためである。

## 統合テスト

すべての`handler.ts`について、同じディレクトリに統合テストを作成する。

```txt
.
└── application/
    └── submit/
        ├── route.ts
        ├── handler.ts
        └── handler.integration.test.ts
```

APIの主要な振る舞いは、実際のDBやそれに近い環境を使用した統合テストで保証する。

最低限、次の観点を確認する。

- 正常な入力で期待する結果が返る
- 不正な入力や状態で適切なエラーになる
- 必要なデータが正しく作成・更新・削除される
- 権限のないユーザーが処理を実行できない
- 関連データとの整合性が維持される

## `shared`の役割

`shared`には、複数のAPIで共通して使用する、重要性の高いドメインロジックを配置する。

次のような処理が対象となる。

- 実装が分散するとデータ整合性が崩れる処理
- 複数のAPIで同じ判定結果に統一する必要がある処理
- 金額・在庫・権限・状態遷移などの重要な計算や判定

### `shared`に置かない処理

API固有のレスポンス変換や、そのAPIでしか使用しない小さな処理は、原則として`handler.ts`内に記述する。
例えば、次のような処理はAPI固有の表示形式への変換であり、データ整合性を担保するドメインロジックではないため、無理に共通化しない。

```ts
function toFanEventDetail(event: EventForPresenter) {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    eventOrganizerName: event.organizer?.name ?? "主催者未設定",
    location: event.performances[0]?.venue.name ?? "会場未定",
    imageUrl: getEventImageUrl(event),
    tags: getEventTags(event),
    rateTypes: [...(event.rateTypes ?? [])]
      .sort((first, second) => first.displayOrder - second.displayOrder)
      .map((rateType) => ({
        id: rateType.id,
        name: rateType.name,
        displayOrder: rateType.displayOrder,
      })),
    performances: event.performances.map((performance) => ({
      id: performance.id,
      name: performance.name,
      venueName: performance.venue.name,
      doorsOpenAt: (performance.doorsOpenAt ?? performance.startsAt).toISOString(),
      startsAt: performance.startsAt.toISOString(),
      admissionMethod: performance.inventoryPools[0]?.admissionMethod ?? "GENERAL_ADMISSION",
    })),
    saleWindows: event.saleWindows.map((saleWindow) => toFanSaleWindow(saleWindow)),
  };
}
```

ただし、同じレスポンス変換が複数APIで必要になった場合は、API設計そのものに重複がないかを先に確認する。

## `shared`のファイル構成

`shared`配下は、ドメインの関心ごとにディレクトリを分ける。

```txt
.
└── shared/
    ├── event/
    │   ├── calculate-event-sales.ts
    │   └── get-event-tags.ts
    └── application/
        └── validate-application-limit.ts
```

ファイルは、原則として1ファイルにつき1つの関数だけをexportする。
ファイル名とexportする関数名は一致させる。

```ts
// calculate-event-sales.ts
export function calculateEventSales() {
  // ...
}
```

1つのファイルから多数の関数をexportする、用途の曖昧なユーティリティファイルは作らない。

```txt
# 避ける
shared/utils.ts
shared/helpers.ts
shared/common.ts
```

また、似た役割の関数を増やしすぎないようにする。
似た役割の関数が乱立するとそれぞれの違いがわからなくなり、混乱が生まれてしまうためである。

```txt
calculate-event-sales.ts
calc-event-sales.ts
get-event-sales.ts
build-event-sales.ts
```

同じ概念を扱う関数がすでに存在する場合は、新しい関数を追加する前に既存処理へ統合できないか確認する。

## APIインターフェースの型定義

各APIの`route.ts`で、input schemaとoutput schemaを明示的に定義する。

```ts
const inputSchema = z.object({
  eventId: z.string().uuid(),
});

const outputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
```

Prismaが自動生成する型をそのままAPIのinputまたはoutputとして使用しない。DB側の変更がそのままAPIの破壊的変更になることを防ぐためである。

API間でinput / output型を無理に共有する必要はない。似た形のレスポンスであっても、別のAPIである以上、将来それぞれが独立して変更される可能性があるためである。

## APIルートの作成

### procedureの選択

APIの利用者と必要な権限に応じて、適切なprocedureを選択する。

特に、次のような認可漏れを起こさないこと。

- platform管理者向けAPIを一般ユーザーが実行できる
- 主催者向けAPIを主催者ではないユーザーが実行できる
- 他の主催者が所有するイベントを操作できる
- ログイン必須のAPIを未認証ユーザーが実行できる

### APIの重複

同じ利用者向けに、同じ役割のAPIが重複して存在しないか確認する。似たAPIが増えると、どれを使用すべきか分かりにくくなり、仕様差分も発生しやすいためである。

```txt
fan/event/get
fan/event/detail
fan/event/find
```

ただし、`fan`、`organizer`、`platform`では権限や必要な情報が異なるため、それぞれに似た役割のAPIが存在することは問題ない。

```txt
fan/event/get
organizer/event/get
platform/event/get
```

## ドメインロジック

### 配列の順番に依存しない

配列の先頭要素を、暗黙的に代表データとして扱う実装は避ける。

```ts
event.performances[0];
performance.inventoryPools[0];
offer.saleOfferEntitlements[0];
```

このような実装は、データの並び順が変わっただけで結果が変化する。

また、公演・在庫・権利などが複数存在するようになった際に、どのデータが使用されるか分からなくなる。

必要な要素は、意味のある条件で明示的に選択する。

```ts
const earliestPerformance = event.performances.reduce((earliest, performance) =>
  performance.startsAt < earliest.startsAt ? performance : earliest,
);

const targetInventoryPool = performance.inventoryPools.find(
  (inventoryPool) => inventoryPool.id === inventoryPoolId,
);
```

本当に先頭要素を使用する仕様である場合は、次のいずれかを明確にする。

- クエリ時に並び順を指定する
- `displayOrder`などの順序を表すカラムを使用する
- なぜ先頭要素を選ぶのかを関数名やコメントで示す
- 配列が必ず1件であることをschemaまたはDB制約で保証する

「たまたま最初に入っていた要素」を業務上の代表値として使用しない。

## 判断に迷った場合

処理をどこに配置するか迷った場合は、次の順番で判断する。

1. そのAPIでしか使用しない処理か

   - `handler.ts`に置く

2. 複数APIで使用する処理か

   - API設計の重複がないか確認する

3. 実装が分散するとデータ整合性が崩れるか

   - `shared`に置く

4. 単にコードを短くしたいだけか

   - 無理に共通化しない
