import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { toast } from "sonner";
import z from "zod";

import { AuthPanelLayout } from "@/features/auth/_components/auth-panel-layout";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/orpc";

export function OrganizerSignUpPage() {
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      name: "",
      organizerName: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          name: value.name,
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: async () => {
            // ユーザー作成だけでは主催者管理画面に入れないため、続けて主催者アカウントを作る
            try {
              await client.organizer.account.signUp({
                organizerName: value.organizerName,
              });
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "主催者アカウントの作成に失敗しました",
              );
              return;
            }

            toast.success("主催者アカウントを作成しました");
            navigate({ to: "/" });
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "名前は2文字以上で入力してください"),
        organizerName: z.string().min(2, "主催者名は2文字以上で入力してください"),
        email: z.email("メールアドレスを入力してください"),
        password: z.string().min(8, "パスワードは8文字以上で入力してください"),
      }),
    },
  });

  return (
    <AuthPanelLayout
      title="主催者登録"
      description="主催者アカウントを作成すると、イベントの作成と販売管理ができます。"
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
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>名前</Label>
              <Input
                id={field.name}
                name={field.name}
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

        <form.Field name="organizerName">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>主催者名</Label>
              <Input
                id={field.name}
                name={field.name}
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

        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>パスワード</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
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
              {isSubmitting ? "送信中" : "登録"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthPanelLayout>
  );
}
