export function parseAllowedEmails(raw?: string): Set<string> {
  if (!raw?.trim()) {
    return new Set();
  }

  return new Set(
    raw
      .split(/[,\n]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(
  email?: string | null,
  raw = process.env.ALLOWED_EMAILS,
): boolean {
  if (!email?.trim()) {
    return false;
  }

  const allowedEmails = parseAllowedEmails(raw);

  if (allowedEmails.size === 0) {
    return true;
  }

  return allowedEmails.has(email.trim().toLowerCase());
}
