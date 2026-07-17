import type postgres from "postgres";

import { postgresClient } from "@/db";

const STOCK_ALERTS_LOCK_NAMESPACE = 1_397_314_627;
const ALERT_CHECK_JOB_LOCK_ID = 1;

export type AlertCheckJobLockResult<T> =
  | { acquired: false }
  | { acquired: true; value: T };

export async function withPostgresAlertCheckJobLock<T>(
  operation: () => Promise<T>,
  client: Pick<postgres.Sql, "reserve"> = postgresClient,
): Promise<AlertCheckJobLockResult<T>> {
  const connection = await client.reserve();

  try {
    const [lock] = await connection<
      [{ acquired: boolean }]
    >`select pg_try_advisory_lock(${STOCK_ALERTS_LOCK_NAMESPACE}, ${ALERT_CHECK_JOB_LOCK_ID}) as acquired`;

    if (!lock?.acquired) {
      return { acquired: false };
    }

    try {
      return { acquired: true, value: await operation() };
    } finally {
      await connection`select pg_advisory_unlock(${STOCK_ALERTS_LOCK_NAMESPACE}, ${ALERT_CHECK_JOB_LOCK_ID})`;
    }
  } finally {
    connection.release();
  }
}
