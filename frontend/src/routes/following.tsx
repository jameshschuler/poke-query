import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2Icon, UserMinusIcon, UsersIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { PageShell } from '#/components/page-shell'
import { getMeFollowing, unfollowTrainer } from '#/lib/poke-query-api'
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import { requireAuthenticated } from '#/lib/route-auth'

export const Route = createFileRoute('/following')({
  ssr: false,
  beforeLoad: async () => {
    await requireAuthenticated('/following')
  },
  component: FollowingPage,
})

const followedDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function getAvatarFallback(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return 'TR'
  }

  const [first = '', second = ''] = trimmed.split(/\s+/)
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
}

function FollowingPage() {
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['me-following'],
    queryFn: getMeFollowing,
  })

  const unfollowMutation = useMutation({
    mutationFn: unfollowTrainer,
    onSuccess: async () => {
      toast.success('Unfollowed trainer.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me-following'] }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ])
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not unfollow trainer.'),
      )
    },
  })

  const following = data?.following ?? []
  const normalizedSearch = searchText.trim().toLowerCase()

  const filteredFollowing = useMemo(
    () =>
      following.filter((trainer) => {
        if (!normalizedSearch) {
          return true
        }

        const searchableText = [trainer.displayName, trainer.username]
          .join(' ')
          .toLowerCase()

        return searchableText.includes(normalizedSearch)
      }),
    [following, normalizedSearch],
  )

  const visibleCount = filteredFollowing.length

  return (
    <PageShell
      title="Following"
      subtitle="Manage the trainers you follow, quickly search them, and unfollow when needed."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" size="lg" className="px-4">
                <UsersIcon className="size-4" />
                Following: {data?.total ?? 0}
              </Badge>
              <Badge variant="outline" size="lg" className="px-4">
                Visible: {visibleCount}
              </Badge>
            </div>
          </div>

          <div className="mt-3">
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by display name or username"
              className="h-10 rounded-xl border border-border/70 bg-card"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Loading followed trainers...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-6 text-sm text-muted-foreground">
            Could not load your following list right now.
          </div>
        ) : filteredFollowing.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/95 p-8 text-center">
            <h3 className="text-base font-semibold">
              No followed trainers found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search or discover new trainers to follow.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFollowing.map((trainer) => (
              <article
                key={trainer.id}
                className="rounded-2xl border border-border/70 bg-card/95 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={trainer.avatarUrl ?? ''}
                        alt={trainer.displayName}
                      />
                      <AvatarFallback>
                        {getAvatarFallback(trainer.displayName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {trainer.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{trainer.username}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Following since{' '}
                        {followedDateFormatter.format(
                          new Date(trainer.followedAt),
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      render={
                        <Link
                          to="/trainers/$username"
                          params={{ username: trainer.username }}
                        />
                      }
                    >
                      View profile
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={unfollowMutation.isPending}
                      onClick={() => unfollowMutation.mutate(trainer.id)}
                    >
                      {unfollowMutation.isPending ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <UserMinusIcon className="size-4" />
                      )}
                      Unfollow
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && following.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 text-sm text-muted-foreground">
            Use Discover to find trainers and start following them.
          </div>
        ) : null}

        {!isLoading &&
        !error &&
        following.length > 0 &&
        filteredFollowing.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5 text-sm text-muted-foreground">
            No matches for "{searchText.trim()}".
          </div>
        ) : null}
      </div>
    </PageShell>
  )
}
