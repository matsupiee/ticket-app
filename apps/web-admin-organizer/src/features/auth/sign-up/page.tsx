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
  const { data: session } = authClient.useSession();
  const createOrganizerAccount = async (organizerName: string) => {
    try {
      await client.organizer.account.signUp({ organizerName });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "主催者アカウントの作成に失敗しました");
      return;
    }

    toast.success("主催者アカウントを作成しました");
    navigate({ to: "/" });
  };

  const form = useForm({
    defaultValues: {
      name: "",
      organizerName: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      // 登録はユーザー作成と主催者アカウント作成の2段階になる。主催者アカウント作成だけ失敗すると
      // ログイン済みかつ主催者未所属で詰むため、セッションがある場合はユーザー作成を飛ばしてやり直せるようにする
      if (session) {
        await createOrganizerAccount(value.organizerName);
        return;
      }

      await authClient.signUp.email(
        {
          name: value.name,
          email: value.email,
          password: value.password,
        },
        {
          // ユーザー作成だけでは主催者管理画面に入れないため、続けて主催者アカウントを作る
          onSuccess: async () => {
            await createOrganizerAccount(value.organizerName);
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      // セッションがある場合はユーザー作成を行わないため、主催者名だけを検証する
      onSubmit: z
        .object({
          name: z.string(),
          organizerName: z.string(),
          email: z.string(),
          password: z.string(),
        })
        .superRefine((value, ctx) => {
          if (value.organizerName.length < 2) {
            ctx.addIssue({
              code: "custom",
              path: ["organizerName"],
              message: "主催者名は2文字以上で入力してください",
            });
          }

          if (session) {
            return;
          }

          if (value.name.length < 2) {
            ctx.addIssue({
              code: "custom",
              path: ["name"],
              message: "名前は2文字以上で入力してください",
            });
          }

          if (!z.email().safeParse(value.email).success) {
            ctx.addIssue({
              code: "custom",
              path: ["email"],
              message: "メールアドレスを入力してください",
            });
          }

          if (value.password.length < 8) {
            ctx.addIssue({
              code: "custom",
              path: ["password"],
              message: "パスワードは8文字以上で入力してください",
            });
          }
        }),
    },
  });

  return (
    <AuthPanelLayout
      title="主催者登録"
      description={
        session
          ? "ログイン中のユーザーに紐づく主催者アカウントを作成します。"
          : "主催者アカウントを作成すると、イベントの作成と販売管理ができます。"
      }
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
        {session ? null : (
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
        )}

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

        {session ? null : (
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
        )}

        {session ? null : (
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
        )}

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
