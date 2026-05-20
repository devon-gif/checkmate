/**
 * lib/checkray-core/index.ts
 *
 * Barrel export for Ray Core shared logic.
 *
 * Import from: "@/lib/checkray-core" or relative path.
 * Safe for both server and client — no server-only imports here.
 */

export * from "./types"
export * from "./schema"
export * from "./risk-levels"
export * from "./safe-wording"
export * from "./categories"

/**
 * validateRayReport
 *
 * Validates an unknown API response body against the RayReportSchema.
 * Returns { success, data, error }.
 *
 * Use in the API route to validate outgoing report before sending.
 * Use in the extension to validate incoming response before rendering.
 */
import { RayReportSchema, RayApiResponseSchema } from "./schema"

export function validateRayReport(value: unknown) {
  return RayReportSchema.safeParse(value)
}

export function validateRayApiResponse(value: unknown) {
  return RayApiResponseSchema.safeParse(value)
}
