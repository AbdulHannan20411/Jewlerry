/**
 * Consistent return shape for Server Actions, so client forms can render
 * field-level errors without relying on Next.js error boundaries for
 * ordinary, expected validation/business failures (those are reserved for
 * actual bugs).
 */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionOk<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError<T = undefined>(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> {
  return { success: false, error, fieldErrors };
}
