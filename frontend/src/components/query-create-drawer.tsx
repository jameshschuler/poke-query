import { useAuth } from '@authabase/react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { createQuery, updateQuery } from '#/lib/poke-query-api'

type QueryCreateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  mode?: 'create' | 'edit'
  queryId?: string
  initialQuery?: {
    title: string
    query: string
    description: string | null
    isPublic: boolean
  }
}

type VisibilityMode = 'public' | 'private'

export function QueryCreateDrawer({
  open,
  onOpenChange,
  onSuccess,
  mode = 'create',
  queryId,
  initialQuery,
}: QueryCreateDrawerProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<VisibilityMode>('public')

  useEffect(() => {
    if (!open) {
      return
    }

    setTitle(initialQuery?.title ?? '')
    setQuery(initialQuery?.query ?? '')
    setDescription(initialQuery?.description ?? '')
    setVisibility(
      initialQuery ? (initialQuery.isPublic ? 'public' : 'private') : 'public',
    )
  }, [initialQuery, open])

  useEffect(() => {
    if (open) {
      return
    }

    setTitle('')
    setQuery('')
    setDescription('')
    setVisibility('public')
  }, [open])

  const createMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const payload = {
        title: title.trim(),
        query: query.trim(),
        description: description.trim() || undefined,
        isPublic,
      }

      if (mode === 'edit') {
        if (!queryId) {
          throw new Error('Missing query id')
        }

        return updateQuery(queryId, payload)
      }

      return createQuery(payload)
    },
    onSuccess: async (result, isPublic) => {
      const verb =
        mode === 'edit'
          ? 'updated'
          : isPublic
            ? 'published'
            : 'saved as a draft'
      toast.success(`String ${verb}.`)
      onSuccess?.()

      if (mode === 'edit') {
        onOpenChange(false)
        return
      }

      if (isPublic) {
        await navigate({
          to: '/queries/$queryId',
          params: { queryId: result.id },
          replace: true,
        })
        return
      }

      onOpenChange(false)
      await navigate({ to: '/library', replace: true })
    },
    onError: () => {
      toast.error('Could not save string.')
    },
  })

  const canSubmit = title.trim().length >= 3 && query.trim().length > 0

  function handleSubmit(nextVisibility: VisibilityMode) {
    if (!canSubmit || createMutation.isPending) {
      return
    }

    setVisibility(nextVisibility)
    createMutation.mutate(nextVisibility === 'public')
  }

  const isPublic = visibility === 'public'
  const drawerTitle = mode === 'edit' ? 'Edit String' : 'New String'
  const drawerDescription =
    mode === 'edit'
      ? 'Update the title, string, description, and visibility.'
      : 'Draft it privately or publish it to the community.'
  const primaryLabel = mode === 'edit' ? 'Save Changes' : 'Publish'

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <DrawerTitle>{drawerTitle}</DrawerTitle>
            <DrawerDescription>{drawerDescription}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close create string drawer"
            >
              <XIcon className="size-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">Name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Max IV Attackers"
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              maxLength={100}
              autoComplete="off"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Search string</span>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="4*&!traded&cp2500-"
              className="min-h-40 w-full resize-none rounded-2xl border border-border/60 bg-background px-3 py-3 font-mono text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this string is for..."
              className="min-h-24 w-full resize-none rounded-2xl border border-border/60 bg-background px-3 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              maxLength={500}
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">Visibility</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  isPublic
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-background hover:bg-muted'
                }`}
                onClick={() => setVisibility('public')}
              >
                Public
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  !isPublic
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-background hover:bg-muted'
                }`}
                onClick={() => setVisibility('private')}
              >
                Private
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPublic
                ? 'Public strings can be discovered by the community.'
                : 'Private drafts stay in your library until you publish them.'}
            </p>
          </div>
        </div>

        <DrawerFooter className="border-t border-border/60 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              {mode === 'create' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={!canSubmit || createMutation.isPending}
                  onClick={() => handleSubmit('private')}
                >
                  {createMutation.isPending && visibility === 'private' ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  Save Draft
                </Button>
              ) : null}
              <Button
                type="button"
                className="rounded-xl"
                disabled={!canSubmit || createMutation.isPending}
                onClick={() =>
                  handleSubmit(mode === 'edit' ? visibility : 'public')
                }
              >
                {createMutation.isPending &&
                (mode === 'edit' || visibility === 'public') ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {primaryLabel}
              </Button>
            </div>
          </div>
          {user ? null : (
            <p className="text-xs text-muted-foreground">
              You need to be signed in to create a string.
            </p>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
