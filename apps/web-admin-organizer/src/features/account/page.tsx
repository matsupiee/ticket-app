import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import type { ReactNode } from "react";

export function AccountSettingsPage() {
  return (
    <main className="overflow-y-auto bg-background">
      <section className="border-b">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 md:px-6">
          <p className="text-xs font-medium text-muted-foreground">account</p>
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">アカウント設定</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            主催者プロフィール、メンバー、銀行口座を管理します。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-3 md:px-6">
        <SettingsSection title="プロフィール">
          <Field label="主催者名" defaultValue="Orbit Works" />
          <Field label="担当者名" defaultValue="山田 花子" />
          <Button className="text-sm">プロフィールを保存</Button>
        </SettingsSection>

        <SettingsSection title="メンバー設定">
          <div className="divide-y border-y text-sm">
            <div className="grid gap-1 py-3">
              <span className="font-medium">organizer@example.com</span>
              <span className="text-xs text-muted-foreground">オーナー</span>
            </div>
            <div className="grid gap-1 py-3">
              <span className="font-medium">staff@example.com</span>
              <span className="text-xs text-muted-foreground">運用担当</span>
            </div>
          </div>
          <Button variant="outline" className="text-sm">
            メンバーを招待
          </Button>
        </SettingsSection>

        <SettingsSection title="銀行口座設定">
          <Field label="金融機関" defaultValue="サンプル銀行" />
          <Field label="支店" defaultValue="渋谷支店" />
          <Field label="口座番号" defaultValue="1234567" />
          <Button className="text-sm">口座情報を保存</Button>
        </SettingsSection>
      </section>
    </main>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  const id = label;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} defaultValue={defaultValue} />
    </div>
  );
}
