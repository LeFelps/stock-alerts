"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function updateEmailAlertsPreference(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const emailAlertsEnabled = formData.get("emailAlertsEnabled") === "true";

  await db
    .update(users)
    .set({ emailAlertsEnabled })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard/settings");
}
