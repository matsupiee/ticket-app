# docs index

このディレクトリは、要件・設計判断・運用上の重要な知識を残す場所です。

## 入口

- [requirement.md](./requirement.md): 現時点のプロダクト要件。
- [development-setup.md](./development-setup.md): ローカル開発環境のセットアップ手順。
- [db-seed-data.md](./db-seed-data.md): 開発用DB seedデータのパターンと実行方法。

## コーディング規約

- [coding-pattern/backend.md](./coding-pattern/backend.md): API実装とディレクトリ構成の規約。
- [coding-pattern/frontend.md](./coding-pattern/frontend.md): フロントエンド実装とディレクトリ構成の規約。
- [coding-pattern/test.md](./coding-pattern/test.md): テスト配置とテストデータ作成の規約。
- [coding-pattern/playwright.md](./coding-pattern/playwright.md): E2E（Playwright）のspec実装の規約。
- [coding-pattern/playwright-page-object.md](./coding-pattern/playwright-page-object.md): E2EのPage Object実装の規約。

## ADR

- [adr/0001-ticket-domain-schema.md](./adr/0001-ticket-domain-schema.md): チケット販売ドメインのDBスキーマ整理。
- [adr/0002-ticket-fee-schema.md](./adr/0002-ticket-fee-schema.md): チケット手数料の設定と注文時明細のDBスキーマ整理。
- [adr/0003-api-runtime-cloud-run.md](./adr/0003-api-runtime-cloud-run.md): APIサーバーをCloud Runで動かす判断。
- [adr/0004-event-wizard-granular-upsert-apis.md](./adr/0004-event-wizard-granular-upsert-apis.md): イベント編集をステップ単位の粒度の細かいupsert APIで構成する判断。
- [adr/0005-entry-number-assignment.md](./adr/0005-entry-number-assignment.md): 整理番号を注文作成時に採番し、座席・在庫枠の確保と排他を整理する判断。
- [adr/0006-e2e-payment-provider-stub.md](./adr/0006-e2e-payment-provider-stub.md): E2Eの決済連携を stripe-mock と自前webhookエンドポイントに分ける判断。
- [adr/0007-api-rewrite-premises.md](./adr/0007-api-rewrite-premises.md): スキーマを正としてAPI層を書き直す際の前提（通貨・数量・手数料・通し券）。
- [adr/0008-entry-number-prefix.md](./adr/0008-entry-number-prefix.md): 整理番号の接頭辞を席種に持たせ、通し券は公演ごとに独立採番する判断。
- [adr/0009-platform-member-authorization.md](./adr/0009-platform-member-authorization.md): プラットフォーム管理者の認可をDBの `PlatformMember` で行う判断。
