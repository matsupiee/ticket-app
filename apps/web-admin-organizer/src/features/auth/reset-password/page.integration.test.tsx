import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: vi.fn(),
  },
}));

const { authClient } = await import("@/lib/auth-client");
// better-auth の型は onSuccess を含む広いオプション型のため、テスト側では Mock として扱う
const requestPasswordReset = authClient.requestPasswordReset as unknown as Mock;
const { OrganizerResetPasswordPage } = await import("./page");

describe("OrganizerResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("メールアドレスを送信すると、ログインページへ戻すリセットリンクを要求する", async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockImplementation(
      async (_input: unknown, options: { onSuccess?: () => void }) => {
        options.onSuccess?.();
        return { data: null, error: null };
      },
    );

    render(<OrganizerResetPasswordPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "organizer@example.com");
    await user.click(screen.getByRole("button", { name: "リセットメールを送信" }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith(
        {
          email: "organizer@example.com",
          redirectTo: `${window.location.origin}/sign-in`,
        },
        expect.anything(),
      );
    });
  });

  it("メールアドレスが不正な場合はエラーを表示し、リセットAPIを呼び出さない", async () => {
    const user = userEvent.setup();

    render(<OrganizerResetPasswordPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "organizer@example");
    await user.click(screen.getByRole("button", { name: "リセットメールを送信" }));

    expect(await screen.findByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });
});
