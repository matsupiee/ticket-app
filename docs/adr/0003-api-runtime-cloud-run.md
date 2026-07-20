# ADR 0003: APIサーバーをCloud Runで動かす

## Status

Accepted

## Context

ローカルのCloudflare Workers / Miniflare環境で、主催者新規登録のRPCが `The Workers runtime canceled this request because it detected that your Worker's code had hung` で失敗した。

ブラウザではCORSエラーに見えていたが、根本原因はレスポンス生成前にWorkerが停止し、CORSヘッダーを返せなかったことだった。

一時的にhandler側で `pg` と生SQLへ逃がす案が入ったが、これはDBアクセスの責務を崩し、型安全性と保守性を落とすため採用しない。

Cloudflare Workers上でPrisma ClientやPostgreSQL connection poolのライフサイクルを合わせ込むより、APIサーバーはNode.js互換の長寿命コンテナとして動かす方が、このプロダクトの現在の要件に合っている。

## Decision

APIサーバーはCloudflare WorkersではなくCloud Runにデプロイする。

- `apps/server` はCloud Runの `PORT` 環境変数で待ち受けるHTTPサーバーとして起動する。
- `@ticket-app/env/server` は `cloudflare:workers` ではなく `process.env` を正本にする。
- Prisma Clientは `@ticket-app/db` のmodule-level singletonとして生成し、コンテナインスタンス内で再利用する。
- Cloud Runの `SIGTERM` を受けたら、APIサーバーを閉じてPrisma Clientをdisconnectする。
- handlerやauth実装は `@ticket-app/db` の `db` / `withDb` だけを使い、独自にPrisma ClientやDBドライバを生成しない。
- `pg` / `postgres` の直接依存・import、API実装でのPrisma raw query、`PrismaClient` の境界外直接生成は `bun run lint` の `check:dependency-policy` で検出する。
- `bun run deploy` はCloud Run APIを先にデプロイし、そのURLを `VITE_SERVER_URL` としてCloudflare上のWebへ渡す。

## Consequences

Prisma Clientをリクエストごとに生成する必要はなくなる。

Cloud Runはコンテナインスタンスを必要に応じて複数立ち上げるため、DB接続数は「Prismaのpool設定 × Cloud Runの最大インスタンス数」で上限を見積もる。
本番DBの接続上限に近づく場合は、Cloud SQL connector、Supabase pooler、Prisma Accelerateなど、DB側または接続層のpooling方針を別ADRで決める。

WebフロントエンドのCloudflareデプロイは継続できるが、API URLはCloud RunのURLを `VITE_SERVER_URL` として明示的に渡す。

Cloud Runデプロイには、少なくとも `GCP_PROJECT_ID` または `GOOGLE_CLOUD_PROJECT`、`CLOUD_RUN_REGION`、`CORS_ORIGIN`、`BETTER_AUTH_URL`、`CLOUD_RUN_SET_SECRETS` を設定する。
`CLOUD_RUN_SET_SECRETS` には、例として `DATABASE_URL=database-url:latest,BETTER_AUTH_SECRET=better-auth-secret:latest` のようにSecret Managerのsecret bindingを指定する。
Artifact Registryのrepository、Secret Managerのsecret、Cloud Build / Cloud Runの権限は初回デプロイ前にGCP側で作成・付与しておく。
