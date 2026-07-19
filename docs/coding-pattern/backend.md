以下のディレクトリ構造に従うこと

```
.
├── routers/　　　　　               # ユーザー種別ごとにルートを完全に分離する/
│   ├── index.ts
│   ├── fan/                    # 一般顧客が叩けるAPI /
│   │   ├── index.ts
│   │   ├── application/        # 1 route : 1 ファイル（同ファイル内にそのAPIのschemaも定義する）
│   │   │   └── submit
│   │   ├── event/
│   │   │   ├── get
│   │   │   └── list
│   │   ├── ticket/
│   │   │   └── list
│   │   └── user/
│   │       ├── profile/
│   │       │   ├── get
│   │       │   └── update
│   │       └── verify-phone
│   ├── organizer/              # イベント主催者が叩けるAPI
│   └── platform/               # プラットフォーム管理者が叩けるAPI
├── handlers/                   # 1 API : 1 handler ファイル 機能ごとのまとまりにディレクトリを分ける/
│   ├── event/
│   │   ├── get.ts
│   │   └── list.ts
│   └── application/
│       └── get-account.ts
└── lib/
```
