# Frontend Patterns (Next.js App Router)

## ディレクトリ構成

ドメイン単位の縦割り構成：技術レイヤーごとに分割するのではなく、ドメイン駆動の縦割り構成を採用します。

各機能・ページが、それぞれのUI、hooks、schemas、utilsを所有します。関連するファイルは同じ場所にまとめて配置してください。

```
.
├── features/
│   ├── event               # event関連のページを集めたディレクトリ/
│   │   ├── _components     # event関連の複数ページでshareされるコンポーネント
│   │   ├── _hooks          # event関連の複数ページでshareされるhooks
│   │   ├── _utils          # event関連の複数ページでshareされる純粋関数・スキーマ
│   │   ├── detail/  # イベント詳細ページの実装に関連するものを集めたディレクトリ
│   │   │   ├── _components
│   │   │   ├── _hooks
│   │   │   ├── _utils
│   │   │   └── page.tsx
│   │   └── list/         # イベント一覧ページの実装に関連するものを集めたディレクトリ
│   │       ├── _components
│   │       ├── _hooks
│   │       └── _utils
│   └── settings            # 設定ページの実装に関連するものを集めたディレクトリ
│
├── shared/
│   ├── _components   # いろんな機能まとまりやページで再利用するコンポーネント
│   ├── _hooks        # いろんな機能まとまりやページで再利用するhooks
│   └── _utils        # いろんな機能まとまりやページで再利用する純粋関数
└── lib/              # アプリ全体の横断的関心ごとを担う外部ライブラリ連携
```

## `src/lib` の役割

`src/lib` は、アプリ全体で使う横断的な関心ごとを担うサードパーティライブラリと連携するためのファイルを置く場所です。たとえば、認証、API通信、モニタリング、ログ収集、分析など、特定の feature に閉じない外部ライブラリの初期化・薄いラッパー・設定を配置します。

特定の feature だけで使う純粋関数や UI ロジックは `src/lib` に置かず、該当 feature 配下の `_utils`、`_hooks`、`_components` に配置してください。複数 feature で再利用するが外部ライブラリ連携ではないものは、`src/shared` 配下に配置します。

## api 型について

`packages/api` で定義した型を import して使い回すようにする。api 型の二重定義を防ぐ
ただし、`packages/api` から型以外の情報を import しないように注意する
`import type` を使うことで、不要なものをブラウザバンドルへ引き込む可能性を減らせる
