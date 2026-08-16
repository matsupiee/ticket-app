import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => navigate,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
  },
}));

const { authClient } = await import("@/lib/auth-client");
// better-auth の型は onSuccess を含む広いオプション型のため、テスト側では Mock として扱う
const signInEmail = authClient.signIn.email as unknown as Mock;
const { PlatformSignInPage } = await import("./page");

describe("PlatformSignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("メールアドレスとパスワードでログインすると、プラットフォーム管理画面へ遷移する", async () => {
    const user = userEvent.setup();
    signInEmail.mockImplementation(async (_input: unknown, options: { onSuccess?: () => void }) => {
      options.onSuccess?.();
      return { data: null, error: null };
    });

    render(<PlatformSignInPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "platform@example.com");
    await user.type(screen.getByLabelText("パスワード"), "platform-pass");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledWith(
        {
          email: "platform@example.com",
          password: "platform-pass",
        },
        expect.anything(),
      );
    });
    expect(navigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("パスワードが短い場合はエラーを表示し、ログインAPIを呼び出さない", async () => {
    const user = userEvent.setup();

    render(<PlatformSignInPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "platform@example.com");
    await user.type(screen.getByLabelText("パスワード"), "short");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByText("パスワードは8文字以上で入力してください")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
