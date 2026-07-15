import { ApiRequestError } from '#/lib/poke-query-api'

export function getMutationErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof ApiRequestError) {
    return error.message
  }

  return fallbackMessage
}
