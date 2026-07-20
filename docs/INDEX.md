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

## ADR

- [adr/0001-ticket-domain-schema.md](./adr/0001-ticket-domain-schema.md): チケット販売ドメインのDBスキーマ整理。
- [adr/0002-ticket-fee-schema.md](./adr/0002-ticket-fee-schema.md): チケット手数料の設定と注文時明細のDBスキーマ整理。
- [adr/0003-api-runtime-cloud-run.md](./adr/0003-api-runtime-cloud-run.md): APIサーバーをCloud Runで動かす判断。
