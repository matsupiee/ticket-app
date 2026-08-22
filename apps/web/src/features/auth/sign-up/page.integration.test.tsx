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
const { FanSignUpPage } = await import("./page");

describe("FanSignUpPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("名前・メールアドレス・パスワードを登録すると、マイページへ遷移する", async () => {
    const user = userEvent.setup();
    signUpEmail.mockImplementation(async (_input: unknown, options: { onSuccess?: () => void }) => {
      options.onSuccess?.();
      return { data: null, error: null };
    });

    render(<FanSignUpPage />);

    await user.type(screen.getByLabelText("名前"), "購入 太郎");
    await user.type(screen.getByLabelText("メールアドレス"), "fan@example.com");
    await user.type(screen.getByLabelText("パスワード"), "fan-password");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith(
        {
          name: "購入 太郎",
          email: "fan@example.com",
          password: "fan-password",
        },
        expect.anything(),
      );
    });
    expect(navigate).toHaveBeenCalledWith({ to: "/my-page" });
  });

  it("入力が不正な場合はエラーを表示し、登録APIを呼び出さない", async () => {
    const user = userEvent.setup();

    render(<FanSignUpPage />);

    await user.type(screen.getByLabelText("名前"), "購");
    await user.type(screen.getByLabelText("メールアドレス"), "fan@example");
    await user.type(screen.getByLabelText("パスワード"), "short");
    await user.click(screen.getByRole("button", { name: "登録" }));

    expect(await screen.findByText("名前は2文字以上で入力してください")).toBeInTheDocument();
    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByText("パスワードは8文字以上で入力してください")).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
