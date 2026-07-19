import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@ticket-app/ui/components/button";
import { ShieldAlert } from "lucide-react";

export function ForbiddenPage() {
  return (
    <main className="overflow-y-auto bg-background">
      <section className="mx-auto grid max-w-xl gap-6 px-4 py-12 text-center md:px-6">
        <ShieldAlert className="mx-auto size-10 text-destructive" aria-hidden="true" />
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-normal">権限がありません</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            この平台管理画面にアクセスできるアカウントでログインしてください。
          </p>
        </div>
        <Link to="/login" className={buttonVariants({ variant: "outline" })}>
          ログインへ
        </Link>
      </section>
    </main>
  );
}
