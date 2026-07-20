# Frontend Patterns（Next.js App Router）

以下のルールに従ってフロントエンドを実装すること。

## 基本方針

技術レイヤー単位ではなく、**ドメイン・機能単位の縦割り構成**を採用する。

```txt
# 避ける構成
components/
hooks/
schemas/
utils/
```

コンポーネント、hooks、schema、純粋関数をアプリ全体で一括管理すると、関連するコードが離れ、変更範囲を把握しにくくなる。

各機能・ページが、自身に必要な次の実装を所有する。

- UIコンポーネント
- hooks
- schema
- 純粋関数
- ページ本体

関連ファイルは、できるだけ同じ機能ディレクトリ内に配置する。

## ディレクトリ構成

```txt
src/
├── features/
│   ├── event/
│   │   ├── _components/        # event内の複数機能で共有するUI
│   │   ├── _hooks/             # event内の複数機能で共有するhooks
│   │   ├── _schemas/           # event内の複数機能で共有するschema
│   │   ├── _utils/             # event内の複数機能で共有する純粋関数
│   │   │
│   │   ├── detail/
│   │   │   ├── _components/
│   │   │   ├── _hooks/
│   │   │   ├── _schemas/
│   │   │   ├── _utils/
│   │   │   └── page.tsx
│   │   │
│   │   └── list/
│   │       ├── _components/
│   │       ├── _hooks/
│   │       ├── _schemas/
│   │       ├── _utils/
│   │       └── page.tsx
│   │
│   └── settings/
│       ├── _components/
│       ├── _hooks/
│       ├── _schemas/
│       ├── _utils/
│       └── page.tsx
│
├── routes/                     # tanstack router のルーティング定義
│
├── shared/
│   ├── components/             # 複数ドメインで再利用するUI
│   ├── hooks/                  # 複数ドメインで再利用するhooks
│   ├── schemas/                # 複数ドメインで再利用するschema
│   └── utils/                  # 複数ドメインで再利用する純粋関数
│
└── lib/                        # 外部ライブラリとの連携
```

## `src/routes`の役割

`src/routes`は、ルーティングを定義する場所とする。
原則としてページの詳細実装を書かない。対応するfeatureのページコンポーネントを呼び出すだけの薄いファイルにする。

## `src/features`の役割

`src/features`には、ドメインやページに紐づく具体的な機能を配置する。

例えばイベント詳細ページだけで使う処理は、次の場所に置く。

```txt
features/event/detail/
```

イベント一覧とイベント詳細の両方で使用する処理は、event直下へ移動する。

```txt
features/event/_components/
features/event/_hooks/
features/event/_schemas/
features/event/_utils/
```

複数ドメインで使用することが確定した場合にのみ、`src/shared`へ移動する。
最初から再利用を予想して`shared`へ配置しない。まずは使用するfeatureの近くに置き、実際に複数箇所で必要になってから共有範囲を広げる。

## ファイルの配置基準

配置場所は、そのファイルが使用される範囲によって決定する。

### 1ページだけで使用する

```txt
features/event/detail/_components/
```

### 同じドメインの複数ページで使用する

```txt
features/event/_components/
```

### 複数ドメインで使用する

```txt
shared/_components/
```

### 外部ライブラリと連携する

```txt
lib/
```

単にコードが似ているという理由だけで共通化しない。見た目が似ていても、変更理由や業務上の意味が異なる場合は、別の実装として保持する。

## `src/shared`の役割

`src/shared`には、複数のドメインや機能で実際に再利用される実装を配置する。

対象となるものは次のとおり。

- 複数ドメインで使用するUIコンポーネント
- 複数ドメインで使用するhooks
- 複数ドメインで使用するschema
- 業務ドメインに依存しない純粋関数

## `src/lib`の役割

`src/lib`には、アプリ全体に関係する外部ライブラリとの連携処理を配置する。

主な対象は次のとおり。

- 認証
- API通信
- モニタリング
- エラー収集
- ログ収集
- アクセス解析
- Feature Flag
- 外部ストレージ

```txt
lib/
├── api/
│   └── client.ts
├── auth/
│   └── client.ts
├── monitoring/
│   └── sentry.ts
└── analytics/
    └── client.ts
```

## API型

APIのinput・output型は、`packages/api`で定義した型を使用する。

フロントエンド側で同じ型を再定義しない。

```ts
import type { GetEventInput, GetEventOutput } from "@project/api/routers/fan/event/get/route";
```

次のものはimportしない。

- handler
- Prisma Client
- DBの型
- DBアクセス処理
- procedure
- サーバー専用ライブラリ
- 環境変数を参照するコード

## 依存方向

依存方向は、原則として次の向きに限定する。

```txt
routes
 ↓
features
 ↓
shared
 ↓
lib
```

より共通度の高い層から、特定の機能へ依存しない。

## バレルimport・export

バレルimport・exportは禁止する。使用するファイルから、実装ファイルを直接importする。

バレルファイルを禁止する理由は次のとおり。

- 依存元が分かりにくくなる
- 循環依存が発生しやすくなる
- 不要なモジュールを読み込む可能性がある
- ファイル移動や削除の影響を追いにくくなる
- コード検索で実装場所へ到達しにくくなる

`index.ts`という名前のファイルは、フレームワークやライブラリの仕様上必要な場合を除き作成しない。

## ファイル名

用途の曖昧なファイル名は避け、ファイル名から処理内容を判断できる名前にする。

```txt
# 避ける
utils.ts
helpers.ts
common.ts
```
