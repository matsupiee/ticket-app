import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { toast } from "sonner";
import z from "zod";

import { AuthPanelLayout } from "@/features/auth/_components/auth-panel-layout";
import { authClient } from "@/lib/auth-client";

export function OrganizerResetPasswordPage() {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: `${window.location.origin}/sign-in`,
        },
        {
          onSuccess: () => {
            toast.success("リセット用メールを送信しました");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("メールアドレスを入力してください"),
      }),
    },
  });

  return (
    <AuthPanelLayout
      title="パスワードリセット"
      description="登録済みのメールアドレスにリセット用のリンクを送ります。"
      footer={
        <Link to="/sign-in" className="text-sm font-medium underline underline-offset-4">
          ログインに戻る
        </Link>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>メールアドレス</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              {field.state.meta.errors.map((error) => (
                <p key={error?.message} className="text-xs text-destructive">
                  {error?.message}
                </p>
              ))}
            </div>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button type="submit" className="w-full text-sm" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "送信中" : "リセットメールを送信"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthPanelLayout>
  );
}
