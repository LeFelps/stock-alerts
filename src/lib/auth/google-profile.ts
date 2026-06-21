import { isEmailAllowed, parseAllowedEmails } from "./allowed-emails";

type GoogleProfile = {
  email?: string | null;
  email_verified?: boolean | null;
};

export function isGoogleProfileAllowed(
  profile?: GoogleProfile,
  rawAllowedEmails = process.env.ALLOWED_EMAILS,
): boolean {
  const hasEmailRestriction = parseAllowedEmails(rawAllowedEmails).size > 0;

  if (hasEmailRestriction && profile?.email_verified !== true) {
    return false;
  }

  return isEmailAllowed(profile?.email, rawAllowedEmails);
}
