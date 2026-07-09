import { useAuth } from '@authabase/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  GlobeIcon,
  LockIcon,
  Loader2Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserXIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PageShell } from '#/components/page-shell'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  ApiRequestError,
  deactivateMe,
  deleteMe,
  getMe,
  getNotificationPreferences,
  reactivateMe,
  updateMe,
  updateNotificationPreferences,
} from '#/lib/poke-query-api'
import type {
  NotificationPreferences,
  VisibleUsername,
} from '#/lib/poke-query-api'
import { requireAuthenticated, setCachedUser } from '#/lib/route-auth'

type AccountSearch = {
  redirect?: string
}

type Team = 'mystic' | 'valor' | 'instinct'

type FormState = {
  username: string
  pogoUsername: string
  visibleUsername: VisibleUsername
  team: Team | ''
  level: string
  trainerCode: string
  avatarUrl: string
  isProfilePublic: boolean
}

type FormErrors = Partial<Record<keyof FormState, string>>

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/
const POGO_USERNAME_PATTERN = /^[a-zA-Z0-9._ -]+$/
const TRAINER_CODE_PATTERN = /^[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}$/

export const Route = createFileRoute('/account')({
  ssr: false,
  validateSearch: (search): AccountSearch => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.trim().length > 0
        ? search.redirect
        : undefined,
  }),
  beforeLoad: async () => {
    await requireAuthenticated('/account')
  },
  component: AccountPage,
})

function AccountPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { signOut } = useAuth()
  const search = Route.useSearch()

  const [formState, setFormState] = useState<FormState>({
    username: '',
    pogoUsername: '',
    visibleUsername: 'pokequery',
    team: '',
    level: '',
    trainerCode: '',
    avatarUrl: '',
    isProfilePublic: false,
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [avatarPreviewFailed, setAvatarPreviewFailed] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [notificationForm, setNotificationForm] =
    useState<NotificationPreferences>({
      notifyNewFollower: true,
      notifyQueryFork: true,
      notifyQueryFavorite: true,
      inAppToasts: true,
    })

  const avatarPreviewUrl = formState.avatarUrl.trim()

  const {
    data: me,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  const { data: notificationPreferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  })

  useEffect(() => {
    if (!me) {
      return
    }

    setFormState({
      username: me.username,
      pogoUsername: me.pogoUsername ?? '',
      visibleUsername: me.visibleUsername,
      team: me.team ?? '',
      level: me.level !== null ? String(me.level) : '',
      trainerCode: me.trainerCode ?? '',
      avatarUrl: me.avatarUrl ?? '',
      isProfilePublic: me.isProfilePublic,
    })
    setAvatarPreviewFailed(false)
    setFormErrors({})
  }, [me])

  useEffect(() => {
    if (!notificationPreferences) {
      return
    }

    setNotificationForm(notificationPreferences)
  }, [notificationPreferences])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = validateForm(formState)
      if (Object.keys(validation).length > 0) {
        setFormErrors(validation)
        throw new Error('validation')
      }

      const trimmedTrainerCode = formState.trainerCode.trim()
      const trimmedPogoUsername = formState.pogoUsername.trim()
      const trimmedAvatarUrl = formState.avatarUrl.trim()
      const levelNumber = Number(formState.level)

      return updateMe({
        username: formState.username.trim(),
        pogoUsername: trimmedPogoUsername || undefined,
        visibleUsername: formState.visibleUsername,
        team: formState.team || undefined,
        level:
          formState.level.trim().length > 0 && Number.isFinite(levelNumber)
            ? levelNumber
            : undefined,
        trainerCode: trimmedTrainerCode || undefined,
        avatarUrl: trimmedAvatarUrl || undefined,
        isProfilePublic: formState.isProfilePublic,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      const updated = await getMe()
      setCachedUser(updated)

      toast.success(
        updated.profileCompleted
          ? 'Profile saved.'
          : 'Changes saved. Complete your profile to remove the account alert.',
      )
      setFormErrors({})

      if (updated.profileCompleted && search.redirect) {
        void navigate({ to: search.redirect, replace: true })
      }
    },
    onError: (mutationError: unknown) => {
      if (
        mutationError instanceof ApiRequestError &&
        mutationError.status === 409
      ) {
        setFormErrors((current) => ({
          ...current,
          username: 'That username is already taken. Try a different one.',
        }))
        toast.error('Username is already taken.')
        return
      }

      if (
        mutationError instanceof ApiRequestError &&
        mutationError.status >= 400 &&
        mutationError.status < 500
      ) {
        toast.error(mutationError.message)
        return
      }

      if (
        mutationError instanceof Error &&
        mutationError.message === 'validation'
      ) {
        toast.error('Fix validation errors before saving.')
        return
      }

      toast.error('Could not save profile.')
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateMe,
    onSuccess: async () => {
      toast.success('Account deactivated.')
      setDeactivateDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => {
      toast.error('Could not deactivate account.')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: reactivateMe,
    onSuccess: async () => {
      toast.success('Account reactivated.')
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => {
      toast.error('Could not reactivate account.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMe,
    onSuccess: async () => {
      setCachedUser(null)
      queryClient.clear()
      await signOut()
      toast.success('Account deleted.')
      void navigate({ to: '/login', replace: true })
    },
    onError: () => {
      toast.error('Could not delete account.')
    },
  })

  const saveNotificationPreferencesMutation = useMutation({
    mutationFn: () => updateNotificationPreferences(notificationForm),
    onSuccess: async (updatedPreferences) => {
      setNotificationForm(updatedPreferences)
      await queryClient.invalidateQueries({
        queryKey: ['notification-preferences'],
      })
      toast.success('Notification preferences saved.')
    },
    onError: () => {
      toast.error('Could not save notification preferences.')
    },
  })

  const isSaving = saveMutation.isPending
  const isDeactivatePending = deactivateMutation.isPending
  const isReactivatePending = reactivateMutation.isPending
  const isDeletePending = deleteMutation.isPending
  const isSavingNotificationPreferences =
    saveNotificationPreferencesMutation.isPending

  const completionHint = useMemo(() => {
    if (!me) {
      return null
    }

    if (me.profileCompleted) {
      return 'Your profile is complete.'
    }

    return 'Finish team, level, trainer code, and username to complete your profile.'
  }, [me])

  function handleChange<TField extends keyof FormState>(
    key: TField,
    value: FormState[TField],
  ) {
    setFormState((current) => ({ ...current, [key]: value }))

    if (key === 'avatarUrl') {
      setAvatarPreviewFailed(false)
    }

    setFormErrors((current) => {
      if (!current[key]) {
        return current
      }

      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleSave() {
    if (isSaving) {
      return
    }

    saveMutation.mutate()
  }

  if (isLoading) {
    return (
      <PageShell
        title="Account"
        subtitle="Manage your profile and account controls."
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading account settings...
        </div>
      </PageShell>
    )
  }

  if (error || !me) {
    return (
      <PageShell
        title="Account"
        subtitle="Manage your profile and account controls."
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <div className="rounded-xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
          Account settings could not be loaded.
        </div>
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title="Account"
        subtitle="Update your trainer identity, privacy settings, and account status."
        contentHeaderVariant="floating"
        showSidebar
        showHeaderSearch={false}
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card/95 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  me.profileCompleted
                    ? 'border-emerald-300/80 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'border-amber-300/80 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300'
                }
              >
                {me.profileCompleted ? (
                  <CheckCircle2Icon className="size-3.5" />
                ) : (
                  <AlertCircleIcon className="size-3.5" />
                )}
                {me.profileCompleted
                  ? 'Profile complete'
                  : 'Profile incomplete'}
              </Badge>

              <Badge
                variant="outline"
                className={
                  me.isProfilePublic
                    ? 'border-sky-300/80 bg-sky-500/10 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300'
                    : 'border-slate-300/80 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/20 dark:text-slate-200'
                }
              >
                {me.isProfilePublic ? (
                  <GlobeIcon className="size-3.5" />
                ) : (
                  <LockIcon className="size-3.5" />
                )}
                {me.isProfilePublic ? 'Public profile' : 'Private profile'}
              </Badge>

              {me.deactivatedAt ? (
                <Badge variant="destructive">
                  <UserXIcon className="size-3.5" />
                  Deactivated
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {completionHint}
            </p>
          </div>

          <section className="rounded-2xl border border-border/70 bg-card/95 p-5">
            <h3 className="text-base font-semibold">Profile Details</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your PokeQuery username is your public app identity and can be
              different from your Pokemon GO trainer name.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">PokeQuery Username</span>
                <Input
                  value={formState.username}
                  onChange={(event) =>
                    handleChange('username', event.target.value)
                  }
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  placeholder="trainer_name"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  3-20 characters. Use letters, numbers, and underscores only.
                </p>
                {formErrors.username ? (
                  <p className="text-xs text-destructive">
                    {formErrors.username}
                  </p>
                ) : null}
              </label>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="avatar-url">
                  Avatar URL
                </label>
                <Input
                  id="avatar-url"
                  value={formState.avatarUrl}
                  onChange={(event) =>
                    handleChange('avatarUrl', event.target.value)
                  }
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  placeholder="https://..."
                />
                {formErrors.avatarUrl ? (
                  <p className="text-xs text-destructive">
                    {formErrors.avatarUrl}
                  </p>
                ) : null}

                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <p className="text-sm font-medium">Avatar Preview</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="size-14 overflow-hidden rounded-full border border-border/70 bg-muted">
                      {avatarPreviewUrl.length > 0 &&
                      !formErrors.avatarUrl &&
                      !avatarPreviewFailed ? (
                        <img
                          src={avatarPreviewUrl}
                          alt="Avatar preview"
                          className="size-full object-cover"
                          onError={() => setAvatarPreviewFailed(true)}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs font-semibold uppercase text-muted-foreground">
                          {formState.username.trim().slice(0, 2) || 'NA'}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {avatarPreviewUrl.length === 0
                        ? 'Enter an image URL to preview your avatar.'
                        : formErrors.avatarUrl
                          ? 'Enter a valid URL to preview.'
                          : avatarPreviewFailed
                            ? 'Image could not be loaded from this URL.'
                            : 'This is how your avatar will appear.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4 md:col-span-2">
                <div>
                  <p className="text-sm font-medium">Pokemon GO Details</p>
                  <p className="text-xs text-muted-foreground">
                    Team, level, and trainer code are your in-game trainer
                    fields.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">
                      Pokemon GO Username
                    </span>
                    <Input
                      value={formState.pogoUsername}
                      onChange={(event) =>
                        handleChange('pogoUsername', event.target.value)
                      }
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      placeholder="AshKetchumGO"
                      maxLength={30}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional, but required if you want to show your Pokemon GO
                      name publicly.
                    </p>
                    {formErrors.pogoUsername ? (
                      <p className="text-xs text-destructive">
                        {formErrors.pogoUsername}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Level</span>
                    <Input
                      type="number"
                      value={formState.level}
                      onChange={(event) =>
                        handleChange('level', event.target.value)
                      }
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      min={1}
                      max={50}
                      placeholder="1-50"
                    />
                    {formErrors.level ? (
                      <p className="text-xs text-destructive">
                        {formErrors.level}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium">Team</span>
                    <select
                      value={formState.team}
                      onChange={(event) =>
                        handleChange(
                          'team',
                          event.target.value as FormState['team'],
                        )
                      }
                      className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="">Select a team</option>
                      <option value="mystic">Team Mystic</option>
                      <option value="valor">Team Valor</option>
                      <option value="instinct">Team Instinct</option>
                    </select>
                    {formErrors.team ? (
                      <p className="text-xs text-destructive">
                        {formErrors.team}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium">Trainer Code</span>
                    <Input
                      value={formState.trainerCode}
                      onChange={(event) =>
                        handleChange('trainerCode', event.target.value)
                      }
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      placeholder="1234 5678 9012"
                      maxLength={14}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use 12 digits. Spaces or dashes are accepted.
                    </p>
                    {formErrors.trainerCode ? (
                      <p className="text-xs text-destructive">
                        {formErrors.trainerCode}
                      </p>
                    ) : null}
                  </label>
                </div>
              </div>
            </div>

            <div
              className={
                formState.isProfilePublic
                  ? 'mt-5 rounded-xl border border-sky-300/80 bg-sky-500/10 p-4 dark:border-sky-500/40 dark:bg-sky-500/20'
                  : 'mt-5 rounded-xl border border-slate-300/80 bg-slate-500/10 p-4 dark:border-slate-500/40 dark:bg-slate-500/20'
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className={
                      formState.isProfilePublic
                        ? 'text-sm font-medium text-sky-700 dark:text-sky-300'
                        : 'text-sm font-medium text-slate-700 dark:text-slate-200'
                    }
                  >
                    Profile Visibility
                  </p>
                  <p
                    className={
                      formState.isProfilePublic
                        ? 'text-xs text-sky-700/85 dark:text-sky-200/85'
                        : 'text-xs text-slate-700/85 dark:text-slate-300/85'
                    }
                  >
                    Public profiles show your trainer details to other users.
                    Private profiles hide team, level, and trainer code.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={
                    formState.isProfilePublic
                      ? 'rounded-xl border-sky-300/80 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 hover:text-sky-800 dark:border-sky-500/50 dark:bg-sky-500/20 dark:text-sky-200 dark:hover:bg-sky-500/30'
                      : 'rounded-xl border-slate-300/80 bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 hover:text-slate-800 dark:border-slate-500/50 dark:bg-slate-500/20 dark:text-slate-200 dark:hover:bg-slate-500/30'
                  }
                  onClick={() =>
                    handleChange('isProfilePublic', !formState.isProfilePublic)
                  }
                >
                  {formState.isProfilePublic ? (
                    <ShieldCheckIcon className="size-4" />
                  ) : (
                    <ShieldAlertIcon className="size-4" />
                  )}
                  {formState.isProfilePublic ? 'Public' : 'Private'}
                </Button>
              </div>

              <div className="mt-3 grid gap-1.5 md:max-w-sm">
                <label className="text-sm font-medium" htmlFor="visible-name">
                  Public Name
                </label>
                <select
                  id="visible-name"
                  value={formState.visibleUsername}
                  onChange={(event) =>
                    handleChange(
                      'visibleUsername',
                      event.target.value as VisibleUsername,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  <option value="pokequery">PokeQuery username</option>
                  <option
                    value="pogo"
                    disabled={formState.pogoUsername.trim().length === 0}
                  >
                    Pokemon GO username
                  </option>
                </select>
                <p
                  className={
                    formState.isProfilePublic
                      ? 'text-xs text-sky-700/85 dark:text-sky-200/85'
                      : 'text-xs text-slate-700/85 dark:text-slate-300/85'
                  }
                >
                  Choose which name other trainers will see on public profile
                  and query cards.
                </p>
                {formErrors.visibleUsername ? (
                  <p className="text-xs text-destructive">
                    {formErrors.visibleUsername}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setFormState({
                    username: me.username,
                    pogoUsername: me.pogoUsername ?? '',
                    visibleUsername: me.visibleUsername,
                    team: me.team ?? '',
                    level: me.level !== null ? String(me.level) : '',
                    trainerCode: me.trainerCode ?? '',
                    avatarUrl: me.avatarUrl ?? '',
                    isProfilePublic: me.isProfilePublic,
                  })
                  setAvatarPreviewFailed(false)
                  setFormErrors({})
                }}
              >
                Reset
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Save profile
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/95 p-5">
            <h3 className="text-base font-semibold">
              Notification Preferences
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose which activity should notify you and whether high-priority
              events should appear as in-app toasts.
            </p>

            <div className="mt-4 grid gap-3">
              <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                <div>
                  <p className="text-sm font-medium">New Followers</p>
                  <p className="text-xs text-muted-foreground">
                    Notify me when another trainer follows my profile.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationForm.notifyNewFollower}
                  onChange={(event) =>
                    setNotificationForm((current) => ({
                      ...current,
                      notifyNewFollower: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 accent-primary"
                />
              </label>

              <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                <div>
                  <p className="text-sm font-medium">Forked Queries</p>
                  <p className="text-xs text-muted-foreground">
                    Notify me when someone forks one of my public queries.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationForm.notifyQueryFork}
                  onChange={(event) =>
                    setNotificationForm((current) => ({
                      ...current,
                      notifyQueryFork: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 accent-primary"
                />
              </label>

              <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                <div>
                  <p className="text-sm font-medium">Favorited Queries</p>
                  <p className="text-xs text-muted-foreground">
                    Notify me when someone favorites one of my public queries.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationForm.notifyQueryFavorite}
                  onChange={(event) =>
                    setNotificationForm((current) => ({
                      ...current,
                      notifyQueryFavorite: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 accent-primary"
                />
              </label>

              <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                <div>
                  <p className="text-sm font-medium">In-app Toast Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Show toast alerts for high-priority events.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationForm.inAppToasts}
                  onChange={(event) =>
                    setNotificationForm((current) => ({
                      ...current,
                      inAppToasts: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 accent-primary"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                className="rounded-xl"
                disabled={isSavingNotificationPreferences}
                onClick={() => saveNotificationPreferencesMutation.mutate()}
              >
                {isSavingNotificationPreferences ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Save notification preferences
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <h3 className="text-base font-semibold text-destructive">
              Danger Zone
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Deactivation can be reverted. Account deletion is permanent and
              signs you out.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {me.deactivatedAt ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={isReactivatePending}
                  onClick={() => reactivateMutation.mutate()}
                >
                  {isReactivatePending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  Reactivate account
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl text-destructive hover:text-destructive"
                  disabled={isDeactivatePending}
                  onClick={() => setDeactivateDialogOpen(true)}
                >
                  {isDeactivatePending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  Deactivate account
                </Button>
              )}

              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                disabled={isDeletePending}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2Icon className="size-4" />
                Delete account
              </Button>
            </div>
          </section>
        </div>
      </PageShell>

      <Dialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate account?</DialogTitle>
            <DialogDescription>
              Your profile will be marked as deactivated. You can reactivate it
              later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeactivatePending}
              onClick={() => deactivateMutation.mutate()}
            >
              {isDeactivatePending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(nextOpen) => {
          setDeleteDialogOpen(nextOpen)
          if (!nextOpen) {
            setDeleteConfirmation('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account permanently?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type DELETE to confirm account removal and
              final sign-out.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            placeholder="Type DELETE"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirmation !== 'DELETE' || isDeletePending}
              onClick={() => deleteMutation.mutate()}
            >
              {isDeletePending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {}

  const username = state.username.trim()
  if (username.length < 3 || username.length > 20) {
    errors.username = 'Username must be 3-20 characters.'
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = 'Use letters, numbers, and underscores only.'
  }

  if (state.level.trim().length > 0) {
    const levelValue = Number(state.level)
    if (!Number.isInteger(levelValue) || levelValue < 1 || levelValue > 50) {
      errors.level = 'Level must be an integer between 1 and 50.'
    }
  }

  const trainerCode = state.trainerCode.trim()
  if (trainerCode.length > 0 && !TRAINER_CODE_PATTERN.test(trainerCode)) {
    errors.trainerCode = 'Enter a valid 12-digit trainer code.'
  }

  const avatarUrl = state.avatarUrl.trim()
  if (avatarUrl.length > 0) {
    try {
      new URL(avatarUrl)
    } catch {
      errors.avatarUrl = 'Avatar URL must be a valid URL.'
    }
  }

  const pogoUsername = state.pogoUsername.trim()
  if (pogoUsername.length > 0) {
    if (pogoUsername.length < 3 || pogoUsername.length > 30) {
      errors.pogoUsername = 'Pokemon GO username must be 3-30 characters.'
    } else if (!POGO_USERNAME_PATTERN.test(pogoUsername)) {
      errors.pogoUsername =
        'Use letters, numbers, spaces, dots, underscores, or dashes only.'
    }
  }

  if (state.visibleUsername === 'pogo' && pogoUsername.length === 0) {
    errors.visibleUsername =
      'Add a Pokemon GO username before showing it publicly.'
  }

  return errors
}
