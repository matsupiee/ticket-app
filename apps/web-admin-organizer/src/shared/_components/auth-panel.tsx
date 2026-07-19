import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@ticket-app/ui/components/button";
import { Input } from "@ticket-app/ui/components/input";
import { Label } from "@ticket-app/ui/components/label";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

type AuthMode = "signIn" | "signUp" | "reset";

export function AuthPanel({
  mode,
  onModeChange,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  return (
    <main className="overflow-y-auto bg-background">
      <section className="mx-auto grid max-w-md gap-6 px-4 py-12 md:px-6">
        <div className="space-y-3 text-center">
          <p className="text-xs font-medium text-muted-foreground">organizer auth</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            {mode === "signIn"
              ? "主催者ログイン"
              : mode === "signUp"
                ? "主催者登録"
                : "パスワードリセット"}
          </h1>
          <p className="text-sm leading-7 text-muted-foreground">
            主催者アカウントでイベント運用画面にアクセスします。
          </p>
        </div>

        {mode === "signIn" ? <SignInForm /> : null}
        {mode === "signUp" ? <SignUpForm /> : null}
        {mode === "reset" ? <PasswordResetForm /> : null}

        <div className="grid gap-2 text-center">
          {mode !== "signIn" ? (
            <Button variant="link" type="button" onClick={() => onModeChange("signIn")}>
              ログインに戻る
            </Button>
          ) : null}
          {mode !== "signUp" ? (
            <Button variant="link" type="button" onClick={() => onModeChange("signUp")}>
              アカウントを作成
            </Button>
          ) : null}
          {mode !== "reset" ? (
            <Button variant="link" type="button" onClick={() => onModeChange("reset")}>
              パスワードをリセット
            </Button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SignInForm() {
  const navigate = useNavigate({ from: "/login" });
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            toast.success("ログインしました");
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
        email: z.email("メールアドレスを入力してください"),
        password: z.string().min(8, "パスワードは8文字以上で入力してください"),
      }),
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <EmailField form={form} />
      <PasswordField form={form} />
      <SubmitButton form={form} label="ログイン" />
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate({ from: "/login" });
  const form = useForm({
    defaultValues: {
      name: "",
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
          onSuccess: () => {
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
        email: z.email("メールアドレスを入力してください"),
        password: z.string().min(8, "パスワードは8文字以上で入力してください"),
      }),
    },
  });

  return (
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
      <EmailField form={form} />
      <PasswordField form={form} />
      <SubmitButton form={form} label="登録" />
    </form>
  );
}

function PasswordResetForm() {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: `${window.location.origin}/login`,
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
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <EmailField form={form} />
      <SubmitButton form={form} label="リセットメールを送信" />
    </form>
  );
}

function EmailField({ form }: { form: any }) {
  return (
    <form.Field name="email">
      {(field: any) => (
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
          {field.state.meta.errors.map((error: any) => (
            <p key={error?.message} className="text-xs text-destructive">
              {error?.message}
            </p>
          ))}
        </div>
      )}
    </form.Field>
  );
}

function PasswordField({ form }: { form: any }) {
  return (
    <form.Field name="password">
      {(field: any) => (
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
          {field.state.meta.errors.map((error: any) => (
            <p key={error?.message} className="text-xs text-destructive">
              {error?.message}
            </p>
          ))}
        </div>
      )}
    </form.Field>
  );
}

function SubmitButton({ form, label }: { form: any; label: string }) {
  return (
    <form.Subscribe
      selector={(state: any) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
    >
      {({ canSubmit, isSubmitting }: { canSubmit: boolean; isSubmitting: boolean }) => (
        <Button type="submit" className="w-full text-sm" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "送信中" : label}
        </Button>
      )}
    </form.Subscribe>
  );
}
