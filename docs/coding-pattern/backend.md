以下のルールに従うこと

## ディレクトリ構成

### 全体

権限管理を楽にするためにユーザー種別ごとにルートを完全に分離します。

```
.
├── routers
│   ├── index.ts
│   ├── fan            # 一般顧客が叩けるAPI
│   ├── organizer      # イベント主催者が叩けるAPI
│   └── platform       # プラットフォーム管理者が叩けるAPI
├── shared             # 複数のrouterから使う共通ロジックなど
└── third-party-lib    # db/決済/メール送信のクライアントなど
```

### 各ルート

1 API ルートごとに 1ディレクトを作成する
route.ts と handler.ts を設置する。

```
.
└── routers/
    ├── index.ts
    └── fan /
        ├── index.ts           # 全ルートを集約して export する
        ├── application/
        │   └── submit         # 1 API ルート : 1 ディレクトリ/
        │       ├── route.ts   # インターフェース（schema や error などの定義）
        │       └── handler.ts # 処理の中身
        └── event /
            ├── get/
            │   ├── route.ts
            │   └── handler.ts
            └── list/
                ├── route.ts
                └── handler.ts
```

## API インターフェース型定義

prisma が自動生成する型をそのまま使わないようにする
db の型と api の型を完全に分離して、db　の型変更が api 通信を壊さないようにする
