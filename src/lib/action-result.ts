export type ActionError =
  | "duplicate_symbol"
  | "invalid_symbol"
  | "not_found"
  | "provider_error"
  | "validation_error";

export type ActionResult<T = undefined> =
  | { data: T; status: "success" }
  | { error: ActionError; status: "error" };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { data, status: "success" };
}

export function actionError<T = undefined>(
  error: ActionError,
): ActionResult<T> {
  return { error, status: "error" };
}
