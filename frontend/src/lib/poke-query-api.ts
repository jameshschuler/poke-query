export type Team = 'mystic' | 'valor' | 'instinct'

export type ApiErrorResponse = {
  error: string
}

export class ApiRequestError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `Request failed with status ${status}`

    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.data = data
  }
}

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000'

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  parseAs?: 'json' | 'void'
}

async function apiRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    parseAs = 'json',
    headers,
    ...init
  }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })

  if (!response.ok) {
    const errorData = await safeParseJson(response)
    throw new ApiRequestError(response.status, errorData)
  }

  if (parseAs === 'void' || response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return { error: `Request failed with status ${response.status}` }
  }
}

export type MessageResponse = {
  message: string
}

export type IdResponse = {
  id: string
}

export type TrainerSummary = {
  id: string
  username: string
  team: Team | null
  level: number | null
  avatarUrl: string | null
}

export type GetTrainerResponse = TrainerSummary & {
  queryCount: number
  forkCount: number
}

export type GetMeResponse = TrainerSummary & {
  queryCount: number
  favoriteCount: number
  forkCount: number
}

export type UpdateMeRequest = {
  username?: string
  level?: number
  team?: Team
  avatarUrl?: string
}

export type LoginRequest = {
  email: string
}

export type VerifyRequest = {
  email: string
  token?: string
  token_hash?: string
  username?: string
  level?: number
  team?: Team
  avatarUrl?: string
}

export type CreateQueryRequest = {
  title: string
  query: string
  description?: string
  isPublic: boolean
}

export type UpdateQueryRequest = {
  title: string
  query: string
  description?: string
  isPublic: boolean
}

export type CommunityQuery = {
  id: string
  creator: {
    id: string
    username: string
    avatarUrl: string | null
    team: Team | null
    level: number | null
  } | null
}

export type CommunityQueryParams = {
  tag?: string
  sort?: 'new' | 'popular'
}

export function login(body: LoginRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/login', {
    method: 'POST',
    body,
  })
}

export function verify(body: VerifyRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/verify', {
    method: 'POST',
    body,
  })
}

export function getMe(): Promise<GetMeResponse> {
  return apiRequest<GetMeResponse>('/api/v1/users/me')
}

export function getTrainer(id: string): Promise<GetTrainerResponse> {
  return apiRequest<GetTrainerResponse>(`/api/v1/users/${id}`)
}

export function updateMe(body: UpdateMeRequest): Promise<IdResponse> {
  return apiRequest<IdResponse>('/api/v1/users/me', {
    method: 'PATCH',
    body,
  })
}

export function deactivateMe(): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/api/v1/users/me/deactivate', {
    method: 'POST',
  })
}

export function reactivateMe(): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/api/v1/users/me/reactivate', {
    method: 'POST',
  })
}

export function deleteMe(): Promise<void> {
  return apiRequest<void>('/api/v1/users/me', {
    method: 'DELETE',
    parseAs: 'void',
  })
}

export function createQuery(body: CreateQueryRequest): Promise<IdResponse> {
  return apiRequest<IdResponse>('/api/v1/queries', {
    method: 'POST',
    body,
  })
}

export function forkQuery(id: string): Promise<IdResponse> {
  return apiRequest<IdResponse>(`/api/v1/queries/${id}/fork`, {
    method: 'POST',
    body: {},
  })
}

export function updateQuery(
  id: string,
  body: UpdateQueryRequest,
): Promise<IdResponse> {
  return apiRequest<IdResponse>(`/api/v1/queries/${id}`, {
    method: 'PATCH',
    body,
  })
}

export function copyQuery(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/queries/${id}/copy`, {
    method: 'PATCH',
    body: {},
    parseAs: 'void',
  })
}

export function favoriteQuery(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/queries/${id}/favorite`, {
    method: 'POST',
    body: {},
    parseAs: 'void',
  })
}

export function unfavoriteQuery(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/queries/${id}/unfavorite`, {
    method: 'POST',
    parseAs: 'void',
  })
}

export function deleteQuery(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/queries/${id}`, {
    method: 'DELETE',
    parseAs: 'void',
  })
}

export function getCommunityQueries(
  params: CommunityQueryParams = {},
): Promise<CommunityQuery[]> {
  const search = new URLSearchParams()

  if (params.tag) {
    search.set('tag', params.tag)
  }

  if (params.sort) {
    search.set('sort', params.sort)
  }

  const queryString = search.toString()
  const path = queryString
    ? `/api/v1/community?${queryString}`
    : '/api/v1/community'

  return apiRequest<CommunityQuery[]>(path)
}

export async function fetchCommunityQueries(): Promise<CommunityQuery[]> {
  return getCommunityQueries({ sort: 'popular' })
}
