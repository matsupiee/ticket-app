import { Link } from "@tanstack/react-router";

export function MyPage({ userName }: { userName: string }) {
  const menus = [
    { to: "/my-page/applications", label: "申し込み履歴", description: "抽選・先着の申し込み状況" },
    { to: "/my-page/tickets", label: "チケット", description: "購入済みチケットの表示" },
    { to: "/my-page/profile", label: "プロフィール", description: "氏名・連絡先の確認と変更" },
  ] as const;

  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-8 md:px-6">
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">マイページ</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            {userName} さんのアカウント情報です。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <nav aria-label="マイページメニュー" className="divide-y border-y">
          {menus.map(({ to, label, description }) => (
            <Link key={to} to={to} className="grid gap-1 py-5 transition-colors hover:text-primary">
              <span className="text-lg font-medium">{label}</span>
              <span className="text-sm text-muted-foreground">{description}</span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
