# ADR 0008: プラットフォーム管理者の認可を DB の PlatformMember で行う

## ステータス

採用（2026-08-16）

## 背景

プラットフォーム管理画面（`apps/web-admin-platform`）は、ログイン済みであれば誰でも開ける状態だった。
`packages/api` の `platform.*` も `protectedProcedure` だけで保護されており、ログインさえしていれば `/rpc/platform/organizer/list` を直接叩いて全主催者の売上を取得できた。
画面側でメールアドレスの許可リストを持つ案もあったが、次の理由で採用しない。

- 許可リストがフロントのビルドに焼き込まれるため、セキュリティ境界にならない。判定が画面側にしかなく、APIは素通しのまま
- 管理者を1人増やすたびにフロントの再ビルド・再デプロイが必要になる
- 誰がいつ権限を付けたかが残らず、監査できない
- テストのたびに許可リストの調整が必要になり、E2Eでユニークなメールアドレスを使えない

## 決定

プラットフォーム管理者を DB の `PlatformMember` テーブルで管理し、認可はサーバー側だけを正とする。

- スキーマ: `PlatformMember { id, createdAt, updatedAt, userId @unique, role }` と `PlatformMemberRole { VIEWER, EDITOR, OWNER }` を追加する。主催者側の `OrganizerMember` に揃える
- API: `packages/api/src/index.ts` に `platformProcedure = protectedProcedure.use(requirePlatformMember)` を追加し、`platform.*` のすべてのルートに適用する。判定は `packages/api/src/shared/platform/require-platform-member.ts` に集約する（`shared/organizer-access.ts` と同じ考え方）
- フロント: `(authenticated)/route.tsx` で `platform.account.me` を呼び、失敗したら `/forbidden` へ送る。主催者管理画面がすでにこの形なので、2つの管理画面で実装が揃う
- 初期管理者: 開発環境は `packages/db/src/seed` で1人作る。本番環境は手動INSERTで作り、その後は既存管理者からの招待導線を追加する（`OrganizerInvitation` に先例がある）

画面側の分岐はあくまで表示のためのものとし、認可の境界は `platformProcedure` に置く。

## 結果

- ログイン済みでも `PlatformMember` に登録されていないユーザーは、`platform.*` API がすべて `FORBIDDEN` になる
- 管理者の追加・削除は DB のレコード操作だけで完結し、フロントの再ビルドが不要になる
- 誰がいつ管理者になったかを `createdAt` で追える
- ロールは定義したが、現時点で `VIEWER` / `EDITOR` / `OWNER` による操作制限の出し分けは行っていない。書き込みAPIを増やす際にロール判定を追加する

## 代替案

- **環境変数（許可リスト）**: 上記のとおり、判定を画面側にしか置けず、セキュリティ境界にならないため不採用
- **better-auth の admin plugin**: `User` に `role` を1つ持たせる形になる。主催者ロールとプラットフォームロールが同じカラムに乗ってしまい、`OrganizerMember` との整合が取りづらいため不採用
