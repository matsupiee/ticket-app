# Development setup

このドキュメントは、ローカルで ticket-app を起動するための最短手順をまとめる。

## 前提

- Bun 1.3.11
- Docker
- Supabase CLI

依存関係をインストールする。

```sh
bun install
```

## 環境変数

サーバー側の環境変数は `apps/server/.env` を正本にする。
Prisma の DB コマンドもこのファイルを読む。

```sh
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
PORT=3000
```

`CORS_ORIGIN` はカンマ区切りで複数指定できる。
localhost または 127.0.0.1 の origin を含めると、実装側で `3001`、`3002`、`3003` のローカル管理画面 origin も trusted origin として扱う。

フロントエンド側は各アプリの `.env` を用意する。

```sh
# apps/web/.env
VITE_SERVER_URL=http://localhost:3000

# apps/web-admin-organizer/.env
VITE_SERVER_URL=http://localhost:3000
VITE_ORGANIZER_ADMIN_EMAILS=organizer@example.com

# apps/web-admin-platform/.env
VITE_SERVER_URL=http://localhost:3000
VITE_PLATFORM_ADMIN_EMAILS=platform@example.com
```

`apps/web-admin-organizer/.env.example` と `apps/web-admin-platform/.env.example` はそのままコピーして使える。

## Supabase DB を起動する

Docker を起動してから、リポジトリルートで次を実行する。

```sh
supabase start --workdir packages/db
```

Supabase の設定は `packages/db/supabase/config.toml` にある。
主なローカルポートは次のとおり。

| 用途            | URL / port               |
| --------------- | ------------------------ |
| Supabase API    | `http://127.0.0.1:54321` |
| PostgreSQL      | `127.0.0.1:54322`        |
| Supabase Studio | `http://127.0.0.1:54323` |
| Inbucket        | `http://127.0.0.1:54324` |

状態確認と停止は次のコマンドを使う。

```sh
supabase status --workdir packages/db
supabase stop --workdir packages/db
```

DB ボリュームごと作り直したい場合は、停止時に `--no-backup` を付ける。
その後、再度 `supabase start` とスキーマ反映を実行する。

```sh
supabase stop --workdir packages/db --no-backup
supabase start --workdir packages/db
bun run db:push
```

## DB スキーマと seed

初回起動後、Prisma schema をローカル DB に反映する。

```sh
bun run db:push
```

開発用 seed データを投入する。

```sh
bun run db:seed
```

seed の内容は [db-seed-data.md](./db-seed-data.md) を正本にする。

スキーマ変更時によく使うコマンド:

```sh
bun run db:generate # Prisma Client を生成
bun run db:migrate  # Prisma migration を作成して適用
bun run db:push     # migration を作らずローカルDBへ反映
bun run db:studio   # Prisma Studio を起動
```

## アプリを起動する

API サーバー、購入者向け web、主催者管理、プラットフォーム管理をまとめて起動する。

```sh
bun run dev
```

ローカルポート:

| アプリ              | URL                     |
| ------------------- | ----------------------- |
| API server          | `http://localhost:3000` |
| web                 | `http://localhost:3001` |
| web-admin-organizer | `http://localhost:3002` |
| web-admin-platform  | `http://localhost:3003` |

個別に起動したい場合:

```sh
bun run dev:server
bun run dev:web
bun run dev:web-admin-organizer
bun run dev:web-admin-platform
```

## 検証コマンド

作業完了前は次を実行する。

```sh
bun test:unit
bun test:int
bun test:e2e
bun run dev
```

`bun run dev` は常駐プロセスなので、API server、web、web-admin-organizer、web-admin-platform がエラーなく立ち上がることを確認したら停止する。
