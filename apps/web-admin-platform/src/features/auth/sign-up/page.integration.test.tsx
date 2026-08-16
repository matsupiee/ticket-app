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
    signUp: {
      email: vi.fn(),
    },
  },
}));

const { authClient } = await import("@/lib/auth-client");
// better-auth の型は onSuccess を含む広いオプション型のため、テスト側では Mock として扱う
const signUpEmail = authClient.signUp.email as unknown as Mock;
const { PlatformSignUpPage } = await import("./page");

describe("PlatformSignUpPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("名前・メールアドレス・パスワードを登録すると、プラットフォーム管理トップへ遷移する", async () => {
    const user = userEvent.setup();
    signUpEmail.mockImplementation(async (_input: unknown, options: { onSuccess?: () => void }) => {
      options.onSuccess?.();
      return { data: null, error: null };
    });

    render(<PlatformSignUpPage />);

    await user.type(screen.getByLabelText("名前"), "運営 太郎");
    await user.type(screen.getByLabelText("メールアドレス"), "platform@example.com");
    await user.type(screen.getByLabelText("パスワード"), "platform-pass");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith(
        {
          name: "運営 太郎",
          email: "platform@example.com",
          password: "platform-pass",
        },
        expect.anything(),
      );
    });
    expect(navigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("入力が不正な場合はエラーを表示し、登録APIを呼び出さない", async () => {
    const user = userEvent.setup();

    render(<PlatformSignUpPage />);

    await user.type(screen.getByLabelText("名前"), "平");
    await user.type(screen.getByLabelText("メールアドレス"), "platform@example");
    await user.type(screen.getByLabelText("パスワード"), "short");
    await user.click(screen.getByRole("button", { name: "登録" }));

    expect(await screen.findByText("名前は2文字以上で入力してください")).toBeInTheDocument();
    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByText("パスワードは8文字以上で入力してください")).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
