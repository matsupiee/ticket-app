const devAllowedPlatformEmails = ["platform@example.com"];

type SessionDataWithEmail = {
  user?: {
    email?: string | null;
  };
} | null;

export function parseAllowedEmails(emailConfig: string | undefined, fallbackEmails: string[]) {
  const configuredEmails = (emailConfig ?? "")
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("ja-JP"))
    .filter(Boolean);

  return configuredEmails.length > 0 ? configuredEmails : fallbackEmails;
}

/**
 * 許可リストの要素は「メールアドレス完全一致」と「@ 始まりのドメイン一致」の2種類を受け付ける。
 * ドメイン指定は、社内ドメイン全体やE2E用ドメインをまとめて許可するために使う。
 */
export function isAllowedAdminEmail(email: string | null | undefined, allowedEmails: string[]) {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLocaleLowerCase("ja-JP");
  const atIndex = normalizedEmail.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) {
    return false;
  }

  const domain = normalizedEmail.slice(atIndex);

  return allowedEmails.some((allowedEmail) =>
    allowedEmail.startsWith("@") ? allowedEmail === domain : allowedEmail === normalizedEmail,
  );
}

export function hasPlatformAdminAccess(sessionData: SessionDataWithEmail) {
  const fallbackEmails = import.meta.env.DEV ? devAllowedPlatformEmails : [];
  const allowedEmails = parseAllowedEmails(
    import.meta.env.VITE_PLATFORM_ADMIN_EMAILS,
    fallbackEmails,
  );

  return isAllowedAdminEmail(sessionData?.user?.email, allowedEmails);
}
