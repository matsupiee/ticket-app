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
    useSession: vi.fn(),
  },
}));

vi.mock("@/lib/orpc", () => ({
  client: {
    organizer: {
      account: {
        signUp: vi.fn(),
      },
    },
  },
}));

const { authClient } = await import("@/lib/auth-client");
const { client } = await import("@/lib/orpc");
// better-auth の型は onSuccess を含む広いオプション型のため、テスト側では Mock として扱う
const signUpEmail = authClient.signUp.email as unknown as Mock;
const useSession = authClient.useSession as unknown as Mock;
const signUpOrganizerAccount = client.organizer.account.signUp as unknown as Mock;
const { OrganizerSignUpPage } = await import("./page");

describe("OrganizerSignUpPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({ data: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("ユーザー登録に続けて主催者アカウントを作成し、ダッシュボードへ遷移する", async () => {
    const user = userEvent.setup();
    signUpEmail.mockImplementation(
      async (_input: unknown, options: { onSuccess?: () => Promise<void> }) => {
        await options.onSuccess?.();
        return { data: null, error: null };
      },
    );
    signUpOrganizerAccount.mockResolvedValue({
      eventOrganizerId: "organizer-1",
      name: "オービットワークス",
      role: "EDITOR",
    });

    render(<OrganizerSignUpPage />);

    await user.type(screen.getByLabelText("名前"), "主催 太郎");
    await user.type(screen.getByLabelText("主催者名"), "オービットワークス");
    await user.type(screen.getByLabelText("メールアドレス"), "organizer@example.com");
    await user.type(screen.getByLabelText("パスワード"), "organizer-pass");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith(
        {
          name: "主催 太郎",
          email: "organizer@example.com",
          password: "organizer-pass",
        },
        expect.anything(),
      );
    });
    expect(signUpOrganizerAccount).toHaveBeenCalledWith({ organizerName: "オービットワークス" });
    expect(navigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("主催者アカウントの作成に失敗した場合は、ダッシュボードへ遷移しない", async () => {
    const user = userEvent.setup();
    signUpEmail.mockImplementation(
      async (_input: unknown, options: { onSuccess?: () => Promise<void> }) => {
        await options.onSuccess?.();
        return { data: null, error: null };
      },
    );
    signUpOrganizerAccount.mockRejectedValue(new Error("同じ主催者名がすでに登録されています"));

    render(<OrganizerSignUpPage />);

    await user.type(screen.getByLabelText("名前"), "主催 太郎");
    await user.type(screen.getByLabelText("主催者名"), "オービットワークス");
    await user.type(screen.getByLabelText("メールアドレス"), "organizer@example.com");
    await user.type(screen.getByLabelText("パスワード"), "organizer-pass");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(signUpOrganizerAccount).toHaveBeenCalled();
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("ログイン済みで主催者未所属の場合は、主催者名だけを入力して主催者アカウントを作成できる", async () => {
    const user = userEvent.setup();
    useSession.mockReturnValue({ data: { user: { id: "user-1" } } });
    signUpOrganizerAccount.mockResolvedValue({
      eventOrganizerId: "organizer-1",
      name: "オービットワークス",
      role: "EDITOR",
    });

    render(<OrganizerSignUpPage />);

    expect(screen.queryByLabelText("メールアドレス")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("パスワード")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("主催者名"), "オービットワークス");
    await user.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(signUpOrganizerAccount).toHaveBeenCalledWith({ organizerName: "オービットワークス" });
    });
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: "/" });
  });

  it("入力が不正な場合はエラーを表示し、登録APIを呼び出さない", async () => {
    const user = userEvent.setup();

    render(<OrganizerSignUpPage />);

    await user.type(screen.getByLabelText("名前"), "主");
    await user.type(screen.getByLabelText("主催者名"), "オ");
    await user.type(screen.getByLabelText("メールアドレス"), "organizer@example");
    await user.type(screen.getByLabelText("パスワード"), "short");
    await user.click(screen.getByRole("button", { name: "登録" }));

    expect(await screen.findByText("名前は2文字以上で入力してください")).toBeInTheDocument();
    expect(screen.getByText("主催者名は2文字以上で入力してください")).toBeInTheDocument();
    expect(screen.getByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(screen.getByText("パスワードは8文字以上で入力してください")).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(signUpOrganizerAccount).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
