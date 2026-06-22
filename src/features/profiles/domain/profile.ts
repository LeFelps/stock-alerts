import type { Brand } from "@/lib/brand";

export type AuthUserId = Brand<string, "AuthUserId">;
export type ProfileId = Brand<string, "ProfileId">;

export type Profile = {
  id: ProfileId;
  authUserId: AuthUserId;
  emailAlertsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toAuthUserId(value: string): AuthUserId {
  return value as AuthUserId;
}

export function toProfileId(value: string): ProfileId {
  return value as ProfileId;
}
