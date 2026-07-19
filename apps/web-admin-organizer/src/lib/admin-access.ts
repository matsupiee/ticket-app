const devAllowedOrganizerEmails = ["organizer@example.com"];

export type SessionDataWithEmail = {
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

export function isAllowedAdminEmail(email: string | null | undefined, allowedEmails: string[]) {
  if (!email) {
    return false;
  }

  return allowedEmails.includes(email.toLocaleLowerCase("ja-JP"));
}

export function hasOrganizerAdminAccess(sessionData: SessionDataWithEmail) {
  const fallbackEmails = import.meta.env.DEV ? devAllowedOrganizerEmails : [];
  const allowedEmails = parseAllowedEmails(
    import.meta.env.VITE_ORGANIZER_ADMIN_EMAILS,
    fallbackEmails,
  );

  return isAllowedAdminEmail(sessionData?.user?.email, allowedEmails);
}
