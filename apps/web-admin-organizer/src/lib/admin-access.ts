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
