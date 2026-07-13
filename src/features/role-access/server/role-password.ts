import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export type VerifyRolePasswordResult =
  | { status: "valid" }
  | { status: "invalid_password" }
  | { status: "not_configured" };

export function verifyRolePassword(
  candidatePassword: string,
): VerifyRolePasswordResult {
  const configuredPassword = process.env.ROLE_ACCESS_PASSWORD;
  if (!configuredPassword) return { status: "not_configured" };

  if (!safelyEqual(candidatePassword, configuredPassword)) {
    return { status: "invalid_password" };
  }

  return { status: "valid" };
}

function safelyEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftDigest, rightDigest);
}
