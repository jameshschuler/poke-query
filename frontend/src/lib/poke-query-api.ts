export type TrainerFollower = {
  id: string
  username: string
  team: Team | null
  level: number | null
  trainerCode: string | null
  isProfilePublic: boolean
  avatarUrl: string | null
  followedAt: string
}

export function getTrainerFollowers(
  id: string,
): Promise<{ total: number; followers: TrainerFollower[] }> {
  return apiRequest(`/api/v1/users/${encodeURIComponent(id)}/followers`)
}

export function getMeFollowers(): Promise<{
  total: number
  followers: TrainerFollower[]
}> {
  return apiRequest('/api/v1/users/me/followers')
}
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
  'http://localhost:4000'

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  parseAs?: 'json' | 'void'
}

function findAccessToken(value: unknown): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'object') {
    if (
      'access_token' in value &&
      typeof (value as { access_token?: unknown }).access_token === 'string'
    ) {
      return (value as { access_token: string }).access_token
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const token = findAccessToken(entry)
        if (token) {
          return token
        }
      }
      return null
    }

    for (const entry of Object.values(value as Record<string, unknown>)) {
      const token = findAccessToken(entry)
      if (token) {
        return token
      }
    }
  }

  return null
}

function getSupabaseAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)

      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) {
        continue
      }

      const raw = window.localStorage.getItem(key)
      if (!raw) {
        continue
      }

      const parsed = JSON.parse(raw) as unknown
      const token = findAccessToken(parsed)

      if (token) {
        return token
      }
    }
  } catch {
    return null
  }

  return null
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
  const requestHeaders = new Headers(headers)

  if (body !== undefined && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json')
  }

  const accessToken = getSupabaseAccessTokenFromStorage()
  if (accessToken && !requestHeaders.has('authorization')) {
    requestHeaders.set('authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: 'include',
    headers: requestHeaders,
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
  hasTrainer: boolean
  email: string | null
  queryCount: number
  favoriteCount: number
  followerCount: number
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
  title: string
  query: string
  description: string | null
  copyCount: number
  favoriteCount: number
  forkCount: number
  autoTags: string[]
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    username: string
    avatarUrl: string | null
    team: Team | null
    level: number | null
  } | null
}

export type QueryDetail = CommunityQuery & {
  isPublic: boolean
  forks: Array<{
    id: string
    title: string
    createdAt: string
    creator: {
      id: string
      username: string
      avatarUrl: string | null
      team: string | null
      level: number | null
    } | null
  }>
}

export type QueryTag = {
  id: string
  name: string
  queryCount: number
}

export type GuestFavoritesResponse = {
  favoriteQueryIds: string[]
  favoritesCount: number
  maxFavorites: number
}

export type GuestSessionResponse = {
  guestId: string
  favoritesCount: number
  maxFavorites: number
}

export function getQueryById(id: string): Promise<QueryDetail> {
  return apiRequest<QueryDetail>(`/api/v1/queries/${id}`)
}

export function getQueryTags(): Promise<QueryTag[]> {
  return apiRequest<{ tags: QueryTag[] }>('/api/v1/queries/tags').then(
    (response) => response.tags,
  )
}

export function ensureGuestSession(): Promise<GuestSessionResponse> {
  return apiRequest<GuestSessionResponse>('/api/v1/queries/guest/session', {
    method: 'POST',
  })
}

export function getGuestFavorites(): Promise<GuestFavoritesResponse> {
  return apiRequest<GuestFavoritesResponse>('/api/v1/queries/guest/favorites')
}

export function favoriteGuestQuery(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/queries/guest/favorites/${id}`, {
    method: 'POST',
    parseAs: 'void',
  })
}

export function unfavoriteGuestQuery(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/queries/guest/favorites/${id}/unfavorite`, {
    method: 'POST',
    parseAs: 'void',
  })
}

export type TrainerPublicQuery = {
  id: string
  title: string
  query: string
  description: string | null
  copyCount: number
  favoriteCount: number
  forkCount: number
  autoTags: string[]
  createdAt: string
}

export type TrainerProfile = {
  id: string
  username: string
  team: Team | null
  level: number | null
  avatarUrl: string | null
  isProfilePublic: boolean
  deactivatedAt: string | null
  createdAt: string
  stringCount: number
  favoriteCount: number
  forkCount: number
  followerCount: number
  trainerCode: string | null
}

export function getTrainerByUsername(
  username: string,
): Promise<TrainerProfile> {
  return apiRequest<TrainerProfile>(
    `/api/v1/users/by-username/${encodeURIComponent(username)}`,
  )
}

export function getTrainerStrings(
  id: string,
): Promise<{ strings: TrainerPublicQuery[] }> {
  return apiRequest(`/api/v1/users/${encodeURIComponent(id)}/strings`)
}

export function getTrainerForks(
  id: string,
): Promise<{ forks: TrainerPublicQuery[] }> {
  return apiRequest(`/api/v1/users/${encodeURIComponent(id)}/forks`)
}

export function getTrainerFavorites(
  id: string,
): Promise<{ favorites: TrainerPublicQuery[] }> {
  return apiRequest(`/api/v1/users/${encodeURIComponent(id)}/favorites`)
}

export type CommunityQueryParams = {
  tag?: string
  filter?: 'all' | 'new' | 'popular'
  sort?: 'created_asc' | 'created_desc' | 'title_asc' | 'title_desc' | 'popular'
  limit?: number
  offset?: number
  search?: string
}

export type CommunityQueriesPage = {
  items: CommunityQuery[]
  pagination: {
    limit: number
    offset: number
    nextOffset: number | null
    hasMore: boolean
  }
}

export function login(body: LoginRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/api/v1/auth/login', {
    method: 'POST',
    body,
  })
}

export function verify(body: VerifyRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/api/v1/auth/verify', {
    method: 'POST',
    body,
  })
}

export function logout(): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/api/v1/auth/logout', {
    method: 'POST',
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

export function getCommunityQueriesPage(
  params: CommunityQueryParams = {},
): Promise<CommunityQueriesPage> {
  const search = new URLSearchParams()

  if (params.tag) {
    search.set('tag', params.tag)
  }

  if (params.sort) {
    search.set('sort', params.sort)
  }

  if (params.filter) {
    search.set('filter', params.filter)
  }

  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }

  if (typeof params.offset === 'number') {
    search.set('offset', String(params.offset))
  }

  if (params.search) {
    search.set('search', params.search)
  }
  const queryString = search.toString()
  const path = queryString
    ? `/api/v1/community?${queryString}`
    : '/api/v1/community'

  return apiRequest<CommunityQueriesPage>(path).catch((error) => {
    if (error instanceof ApiRequestError && error.status === 404) {
      return apiRequest<CommunityQueriesPage>(path)
    }

    throw error
  })
}

export async function getCommunityQueries(
  params: CommunityQueryParams = {},
): Promise<CommunityQuery[]> {
  const page = await getCommunityQueriesPage(params)
  return page.items
}

export async function fetchCommunityQueries(): Promise<CommunityQuery[]> {
  return getCommunityQueries({ filter: 'popular' })
}
