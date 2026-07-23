export type TrainerFollower = {
  id: string
  username: string
  displayName: string
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

export function getMeFollowing(): Promise<{
  total: number
  following: TrainerFollower[]
}> {
  return apiRequest('/api/v1/users/me/following')
}
export type Team = 'mystic' | 'valor' | 'instinct'
export type VisibleUsername = 'pokequery' | 'pogo'

export type ApiErrorResponse = {
  error: string
}

export class ApiRequestError extends Error {
  status: number
  data: unknown
  requestId: string | null

  constructor(status: number, data: unknown, requestId: string | null) {
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
    this.requestId = requestId
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

function createRequestId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `req_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
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
  const requestId = requestHeaders.get('x-request-id') ?? createRequestId()

  requestHeaders.set('x-request-id', requestId)

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
    throw new ApiRequestError(
      response.status,
      errorData,
      response.headers.get('x-request-id') ?? requestId,
    )
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
  displayName: string
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
  profileCompleted: boolean
  role: 'member' | 'admin'
  email: string | null
  pogoUsername: string | null
  visibleUsername: VisibleUsername
  trainerCode: string | null
  isProfilePublic: boolean
  deactivatedAt: string | null
  queryCount: number
  favoriteCount: number
  followerCount: number
  forkCount: number
}

export type UpdateMeRequest = {
  username?: string
  pogoUsername?: string
  visibleUsername?: VisibleUsername
  level?: number
  team?: Team
  trainerCode?: string
  isProfilePublic?: boolean
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
  referenceUrl?: string
  isPublic: boolean
  tags?: string[]
}

export type UpdateQueryRequest = {
  title: string
  query: string
  description?: string
  referenceUrl?: string
  isPublic: boolean
  tags?: string[]
}

export type CommunityQuery = {
  id: string
  title: string
  query: string
  description: string | null
  copyCount: number
  viewCount: number
  favoriteCount: number
  forkCount: number
  qualityScore: number
  source: 'official' | 'community' | null
  referenceUrl: string | null
  userTags: string[]
  autoTags: string[]
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    team: Team | null
    level: number | null
  } | null
}

export type QueryDetail = CommunityQuery & {
  isPublic: boolean
  viewCount: number
  forks: Array<{
    id: string
    title: string
    createdAt: string
    creator: {
      id: string
      username: string
      displayName: string
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

export function recordQueryView(id: string): Promise<{ viewCount: number }> {
  return apiRequest<{ viewCount: number }>(`/api/v1/queries/${id}/views`, {
    method: 'POST',
    body: {},
  })
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
  source?: 'official' | 'community' | null
  referenceUrl: string | null
  userTags: string[]
  autoTags: string[]
  createdAt: string
}

export type ManagedQuery = TrainerPublicQuery & {
  isPublic: boolean
  viewCount: number
  userTags: string[]
  updatedAt: string
}

export type ManagedForkQuery = ManagedQuery & {
  parentQueryId: string | null
  originalQuerySnapshot: string | null
  syncStatus: 'up-to-date' | 'behind' | 'orphaned'
  sourceQuery: {
    id: string
    title: string
    query: string
    isPublic: boolean
    updatedAt: string
    creator: {
      id: string
      username: string
      displayName: string
      avatarUrl: string | null
      team: Team | null
      level: number | null
    } | null
  } | null
}

export type MyFavoriteQuery = {
  id: string
  title: string
  query: string
  description: string | null
  isPublic: boolean
  copyCount: number
  viewCount: number
  favoriteCount: number
  forkCount: number
  referenceUrl: string | null
  userTags: string[]
  autoTags: string[]
  createdAt: string
  updatedAt: string
  favoritedAt: string
  creator: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  } | null
}

export type MyFavoritesPage = {
  favorites: MyFavoriteQuery[]
  pagination: {
    limit: number
    offset: number
    nextOffset: number | null
    hasMore: boolean
    total: number
  }
}

export type MyFavoritesParams = {
  limit?: number
  offset?: number
}

export type MyFavoriteIdsResponse = {
  favoriteQueryIds: string[]
  favoritesCount: number
}

export type TrainerProfile = {
  id: string
  username: string
  displayName: string
  team: Team | null
  level: number | null
  avatarUrl: string | null
  isProfilePublic: boolean
  deactivatedAt: string | null
  createdAt: string
  stringCount: number
  profileViewCount: number
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

export function recordTrainerProfileView(
  id: string,
): Promise<{ viewCount: number }> {
  return apiRequest<{ viewCount: number }>(
    `/api/v1/users/${encodeURIComponent(id)}/views`,
    {
      method: 'POST',
      body: {},
    },
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

export function getMyQueries(): Promise<{ queries: ManagedQuery[] }> {
  return apiRequest('/api/v1/users/me/queries')
}

export function getMyFavoritesPage(
  params: MyFavoritesParams = {},
): Promise<MyFavoritesPage> {
  const search = new URLSearchParams()

  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }

  if (typeof params.offset === 'number') {
    search.set('offset', String(params.offset))
  }

  const queryString = search.toString()
  const path = queryString
    ? `/api/v1/users/me/favorites?${queryString}`
    : '/api/v1/users/me/favorites'

  return apiRequest<MyFavoritesPage>(path)
}

export function getMyFavoriteIds(): Promise<MyFavoriteIdsResponse> {
  return apiRequest<MyFavoriteIdsResponse>('/api/v1/users/me/favorites/ids')
}

export function getMyForks(): Promise<{ forks: ManagedForkQuery[] }> {
  return apiRequest('/api/v1/users/me/forks')
}

export function followTrainer(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/users/${encodeURIComponent(id)}/follow`, {
    method: 'POST',
    body: {},
    parseAs: 'void',
  })
}

export function unfollowTrainer(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/users/${encodeURIComponent(id)}/unfollow`, {
    method: 'POST',
    body: {},
    parseAs: 'void',
  })
}

export type CommunityQueryParams = {
  tag?: string
  filter?: 'all' | 'new' | 'popular' | 'official'
  sort?: 'created_asc' | 'created_desc' | 'title_asc' | 'title_desc' | 'popular'
  limit?: number
  offset?: number
  search?: string
}

export type DiscoverRail =
  | 'weekly_picks'
  | 'featured_today'
  | 'all_time_trusted'
  | 'contextual_picks'
  | 'default'

export type CommunitySurfacingParams = {
  tag?: string
  filter?: 'all' | 'new' | 'popular' | 'official'
  search?: string
  railLimit?: number
}

export type CommunitySurfacingResponse = {
  weeklyPicks: CommunityQuery[]
  featuredToday: CommunityQuery[]
  allTimeTrusted: CommunityQuery[]
  contextualPicks: CommunityQuery[]
  generatedAt: string
  dateKey: string
}

export type CommunitySurfacingMetrics = {
  windowDays: number
  discoverToDetailCtr: number
  copyConversion: number
  impressionDistributionUniqueStrings: number
  totals: {
    impressions: number
    detailClicks: number
    copyActions: number
    uniqueImpressionStrings: number
  }
}

export type WeeklyPickItem = {
  queryId: string
  title: string
  isPublic: boolean
  displayOrder: number
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type WeeklyPicksResponse = {
  items: WeeklyPickItem[]
}

export type UpsertWeeklyPickRequest = {
  queryId: string
  displayOrder?: number
  isActive?: boolean
  startsAt?: string | null
  endsAt?: string | null
  notes?: string | null
}

export type TrackDiscoverEvent = {
  queryId: string
  rail: DiscoverRail
  eventType: 'impression' | 'detail_click' | 'copy_action'
  occurredAt?: string
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

export function syncForkQuery(id: string): Promise<IdResponse> {
  return apiRequest<IdResponse>(`/api/v1/queries/${id}/sync`, {
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

export function getCommunitySurfacing(
  params: CommunitySurfacingParams = {},
): Promise<CommunitySurfacingResponse> {
  const search = new URLSearchParams()

  if (params.tag) {
    search.set('tag', params.tag)
  }

  if (params.filter) {
    search.set('filter', params.filter)
  }

  if (params.search) {
    search.set('search', params.search)
  }

  if (typeof params.railLimit === 'number') {
    search.set('railLimit', String(params.railLimit))
  }

  const queryString = search.toString()
  const path = queryString
    ? `/api/v1/metrics/surfacing?${queryString}`
    : '/api/v1/metrics/surfacing'

  return apiRequest<CommunitySurfacingResponse>(path)
}

export function trackDiscoverEvents(
  sessionKey: string,
  events: TrackDiscoverEvent[],
): Promise<void> {
  if (events.length === 0) {
    return Promise.resolve()
  }

  return apiRequest<void>('/api/v1/metrics/surfacing/events', {
    method: 'POST',
    body: {
      sessionKey,
      events,
    },
    parseAs: 'void',
  })
}

export function getCommunitySurfacingMetrics(
  days = 14,
): Promise<CommunitySurfacingMetrics> {
  const search = new URLSearchParams()
  search.set('days', String(days))

  return apiRequest<CommunitySurfacingMetrics>(
    `/api/v1/metrics/surfacing/metrics?${search.toString()}`,
  )
}

export function getWeeklyPicks(): Promise<WeeklyPicksResponse> {
  return apiRequest<WeeklyPicksResponse>(
    '/api/v1/metrics/surfacing/weekly-picks',
  )
}

export function upsertWeeklyPick(
  body: UpsertWeeklyPickRequest,
): Promise<{ item: WeeklyPickItem }> {
  return apiRequest<{ item: WeeklyPickItem }>(
    '/api/v1/metrics/surfacing/weekly-picks',
    {
      method: 'POST',
      body,
    },
  )
}

export function deleteWeeklyPick(
  queryId: string,
): Promise<{ removedQueryId: string }> {
  return apiRequest<{ removedQueryId: string }>(
    `/api/v1/metrics/surfacing/weekly-picks/${encodeURIComponent(queryId)}`,
    {
      method: 'DELETE',
    },
  )
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

export type NotificationEventType =
  'new_follower' | 'query_forked' | 'query_favorited'

export type AppNotification = {
  id: string
  eventType: NotificationEventType
  entityType: 'trainer' | 'query' | null
  entityId: string | null
  title: string
  message: string
  isHighPriority: boolean
  isRead: boolean
  readAt: string | null
  createdAt: string
  actor: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  } | null
}

export type NotificationPreferences = {
  notifyNewFollower: boolean
  notifyQueryFork: boolean
  notifyQueryFavorite: boolean
  inAppToasts: boolean
}

export type GetNotificationsParams = {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  highPriorityOnly?: boolean
}

export type NotificationsPage = {
  notifications: AppNotification[]
  pagination: {
    limit: number
    offset: number
    nextOffset: number | null
    hasMore: boolean
    total: number
  }
}

export function getNotifications(
  params: GetNotificationsParams = {},
): Promise<NotificationsPage> {
  const search = new URLSearchParams()

  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }

  if (typeof params.offset === 'number') {
    search.set('offset', String(params.offset))
  }

  if (typeof params.unreadOnly === 'boolean') {
    search.set('unreadOnly', String(params.unreadOnly))
  }

  if (typeof params.highPriorityOnly === 'boolean') {
    search.set('highPriorityOnly', String(params.highPriorityOnly))
  }

  const queryString = search.toString()
  const path = queryString
    ? `/api/v1/notifications?${queryString}`
    : '/api/v1/notifications'

  return apiRequest<NotificationsPage>(path)
}

export function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  return apiRequest<{ unreadCount: number }>(
    '/api/v1/notifications/unread-count',
  )
}

export function markNotificationRead(id: string): Promise<void> {
  return apiRequest<void>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    {
      method: 'PATCH',
      parseAs: 'void',
    },
  )
}

export function markAllNotificationsRead(): Promise<void> {
  return apiRequest<void>('/api/v1/notifications/read-all', {
    method: 'PATCH',
    parseAs: 'void',
  })
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>(
    '/api/v1/notifications/preferences',
  )
}

export function updateNotificationPreferences(
  body: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>(
    '/api/v1/notifications/preferences',
    {
      method: 'PATCH',
      body,
    },
  )
}

export type ReportTargetType = 'query' | 'trainer'
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed'

export type SubmitReportRequest = {
  targetType: ReportTargetType
  targetId: string
  reason: string
  details?: string
}

export type SubmitReportResponse = {
  id: string
  status: ReportStatus
}

export type ModerationActor = {
  id: string
  username: string
  displayName: string
} | null

export type ModerationReport = {
  id: string
  targetType: ReportTargetType
  reason: string
  details: string | null
  status: ReportStatus
  target: {
    queryId: string | null
    trainerId: string | null
    label: string
  }
  reporter: ModerationActor
  reviewedBy: ModerationActor
  createdAt: string
  updatedAt: string
}

export type ModerationReportAction = {
  id: string
  action: 'submitted' | 'status_changed' | 'commented'
  fromStatus: ReportStatus | null
  toStatus: ReportStatus | null
  comment: string | null
  actor: ModerationActor
  createdAt: string
}

export type ModerationReportsPage = {
  reports: ModerationReport[]
  pagination: {
    limit: number
    offset: number
    nextOffset: number | null
    hasMore: boolean
    total: number
  }
}

export type GetModerationReportsParams = {
  status?: ReportStatus
  targetType?: ReportTargetType
  limit?: number
  offset?: number
}

export type ModerationReportDetail = {
  report: ModerationReport
  actions: ModerationReportAction[]
}

export function submitReport(
  body: SubmitReportRequest,
): Promise<SubmitReportResponse> {
  return apiRequest<SubmitReportResponse>('/api/v1/moderation/reports', {
    method: 'POST',
    body,
  })
}

export function getModerationAccess(): Promise<{ isReviewer: boolean }> {
  return apiRequest<{ isReviewer: boolean }>('/api/v1/moderation/access')
}

export function getModerationReports(
  params: GetModerationReportsParams = {},
): Promise<ModerationReportsPage> {
  const search = new URLSearchParams()

  if (params.status) {
    search.set('status', params.status)
  }

  if (params.targetType) {
    search.set('targetType', params.targetType)
  }

  if (typeof params.limit === 'number') {
    search.set('limit', String(params.limit))
  }

  if (typeof params.offset === 'number') {
    search.set('offset', String(params.offset))
  }

  const queryString = search.toString()
  const path = queryString
    ? `/api/v1/moderation/reports?${queryString}`
    : '/api/v1/moderation/reports'

  return apiRequest<ModerationReportsPage>(path)
}

export function getModerationReportDetail(
  id: string,
): Promise<ModerationReportDetail> {
  return apiRequest<ModerationReportDetail>(
    `/api/v1/moderation/reports/${encodeURIComponent(id)}`,
  )
}

export function updateModerationReportStatus(
  id: string,
  body: { status: ReportStatus; comment?: string },
): Promise<{ id: string; status: ReportStatus; updatedAt: string }> {
  return apiRequest(
    `/api/v1/moderation/reports/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body,
    },
  )
}
