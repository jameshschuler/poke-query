import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BellIcon, CheckCheckIcon, Loader2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { requireAuthenticated } from '#/lib/route-auth'

type NotificationFilter = 'all' | 'unread' | 'high-priority'

export const Route = createFileRoute('/notifications')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/notifications')
  },
  component: NotificationsPage,
})

function NotificationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const notificationQueryParams = useMemo(() => {
    return {
      limit: 100,
      offset: 0,
      unreadOnly: filter === 'unread',
      highPriorityOnly: filter === 'high-priority',
    }
  }, [filter])

  const {
    data: notificationsPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications', 'list', notificationQueryParams],
    queryFn: () => getNotifications(notificationQueryParams),
  })

  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    staleTime: 15_000,
    refetchInterval: 15_000,
  })

  const notifications = notificationsPage?.notifications ?? []
  const unreadCount = unreadCountData?.unreadCount ?? 0

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(
          mutationError,
          'Could not mark notification as read.',
        ),
      )
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read.')
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(
          mutationError,
          'Could not mark all notifications as read.',
        ),
      )
    },
  })

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [],
  )

  return (
    <PageShell
      title="Notifications"
      subtitle="Track followers, favorites, and forks from the community."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 p-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" size="lg" className="px-4">
              <span className="inline-flex items-center">
                <BellIcon />
              </span>
              Unread: {unreadCount}
            </Badge>
            <Badge variant="outline" size="lg" className="px-4">
              Total:{' '}
              {notificationsPage?.pagination.total ?? notifications.length}
            </Badge>
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            {markAllReadMutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckCheckIcon className="size-4" />
            )}
            Mark all read
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
            { value: 'high-priority', label: 'High Priority' },
          ].map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? 'default' : 'outline'}
              className="rounded-lg"
              onClick={() => setFilter(option.value as NotificationFilter)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Notifications could not be loaded right now.
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/95 p-8 text-center">
            <h3 className="text-base font-semibold">No notifications</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow trainers, favorite strings, and fork community builds to
              start seeing activity here.
            </p>
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                render={<Link to="/discover" />}
              >
                Explore discover
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.isRead
                    ? 'border-border/70 bg-card/95'
                    : 'border-primary/40 bg-primary/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(notification.createdAt))}
                    </p>
                  </div>

                  {!notification.isRead ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(notification.id)}
                    >
                      Mark read
                    </Button>
                  ) : (
                    <Badge variant="outline">Read</Badge>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
