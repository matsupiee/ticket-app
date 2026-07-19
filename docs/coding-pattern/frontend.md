# Frontend Patterns (Next.js App Router)

## ディレクトリ構成

ドメイン単位の縦割り構成：技術レイヤーごとに分割するのではなく、ドメイン駆動の縦割り構成を採用します。

各機能・ページが、それぞれのUI、hooks、schemas、utilsを所有します。関連するファイルは同じ場所にまとめて配置してください。

```
.
├── app/
│   ├── event               # event関連のページを集めたディレクトリ/
│   │   ├── _components     # event関連の複数ページでshareされるコンポーネント
│   │   ├── _hooks          # event関連の複数ページでshareされるhooks
│   │   ├── _utils          # event関連の複数ページでshareされる純粋関数・スキーマ
│   │   ├── (detail)/[id]/  # イベント詳細ページの実装に関連するものを集めたディレクトリ
│   │   │   ├── _components
│   │   │   ├── _hooks
│   │   │   ├── _utils
│   │   │   └── page.tsx
│   │   └── (list)/         # イベント一覧ページの実装に関連するものを集めたディレクトリ
│   │       ├── _components
│   │       ├── _hooks
│   │       └── _utils
│   └── settings            # 設定ページの実装に関連するものを集めたディレクトリ
│
└── shared /
    ├── _components   # いろんな機能まとまりやページで再利用するコンポーネント
    ├── _hooks        # いろんな機能まとまりやページで再利用するhooks
    └── _utils        # いろんな機能まとまりやページで再利用する純粋関数
```
