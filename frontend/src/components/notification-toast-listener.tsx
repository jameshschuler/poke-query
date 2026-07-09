import { useAuth } from '@authabase/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import {
  getNotificationPreferences,
  getNotifications,
} from '#/lib/poke-query-api'

const TOAST_SEEN_STORAGE_KEY = 'pq_seen_toast_notifications'

function loadSeenNotificationIds(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set<string>()
  }

  try {
    const raw = window.sessionStorage.getItem(TOAST_SEEN_STORAGE_KEY)
    if (!raw) {
      return new Set<string>()
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return new Set<string>()
    }

    return new Set(
      parsed.filter((value): value is string => typeof value === 'string'),
    )
  } catch {
    return new Set<string>()
  }
}

function persistSeenNotificationIds(ids: Set<string>) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(
      TOAST_SEEN_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    )
  } catch {
    // Ignore storage failures.
  }
}

export function NotificationToastListener() {
  const { user } = useAuth()
  const seenIdsRef = useRef<Set<string>>(new Set<string>())

  useEffect(() => {
    seenIdsRef.current = loadSeenNotificationIds()
  }, [])

  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
    enabled: Boolean(user),
    staleTime: 60_000,
  })

  const shouldPoll = useMemo(
    () => Boolean(user) && (preferences?.inAppToasts ?? true),
    [preferences?.inAppToasts, user],
  )

  const { data } = useQuery({
    queryKey: ['notifications', 'high-priority-unread'],
    queryFn: () =>
      getNotifications({
        unreadOnly: true,
        highPriorityOnly: true,
        limit: 10,
      }),
    enabled: shouldPoll,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!data || data.notifications.length === 0) {
      return
    }

    let changed = false

    for (const notification of data.notifications) {
      if (seenIdsRef.current.has(notification.id)) {
        continue
      }

      toast(notification.title, {
        description: notification.message,
      })
      seenIdsRef.current.add(notification.id)
      changed = true
    }

    if (changed) {
      persistSeenNotificationIds(seenIdsRef.current)
    }
  }, [data])

  return null
}
