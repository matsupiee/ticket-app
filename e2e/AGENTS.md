`docs/coding-pattern/playwright.md` と `docs/coding-pattern/playwright-page-object.md` を参照してルールに従う。

ディレクトリ構成は以下

```
.
└── e2e/
    ├── specs　
    ├── fixtures/
    │   └── app.fixture.ts // playwright の デフォルトの test を extend したもの
    ├── page-objects/
    │   ├── fan
    │   ├── organizer
    │   └── platform
    └── utils // 便利関数
```
