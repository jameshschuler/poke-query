import { useAuth } from '#/lib/auth-context'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '#/components/ui/input-otp'
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
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { getMutationErrorMessage } from '#/lib/mutation-toast'
import type {
  GetMeResponse,
  NotificationPreferences,
  UpdateMeRequest,
  VisibleUsername,
} from '#/lib/poke-query-api'
import { findBlockedTerm } from '#/lib/content-policy'
import { requireAuthenticated, setCachedUser } from '#/lib/route-auth'
import {
  getThemePreset,
  setThemePreset,
  THEME_PRESET_OPTIONS,
} from '#/lib/theme-preferences'
import type { ThemePreset } from '#/lib/theme-preferences'

type AccountSearch = {
  redirect?: string
  panel?: AccountPanel
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
type AccountPanel = 'profile' | 'theme' | 'notifications' | 'danger'

const ACCOUNT_PANELS: AccountPanel[] = [
  'profile',
  'theme',
  'notifications',
  'danger',
]

function isAccountPanel(value: string): value is AccountPanel {
  return ACCOUNT_PANELS.includes(value as AccountPanel)
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/
const POGO_USERNAME_PATTERN = /^[a-zA-Z0-9._ -]+$/
const TRAINER_CODE_PATTERN = /^[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}$/
const DICEBEAR_STYLES = [
  'adventurer',
  'avataaars',
  'bottts',
  'fun-emoji',
  'identicon',
  'lorelei',
  'micah',
  'miniavs',
  'notionists',
  'open-peeps',
  'pixel-art',
] as const
const ACCOUNT_UPGRADE_SUCCESS_STORAGE_KEY =
  'poke-query:account-upgrade-success-email'

export const Route = createFileRoute('/account')({
  ssr: false,
  validateSearch: (search): AccountSearch => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.trim().length > 0
        ? search.redirect
        : undefined,
    panel:
      typeof search.panel === 'string' && isAccountPanel(search.panel)
        ? search.panel
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
  const { signOut, requestAccountUpgrade, user, verifyAccountUpgrade } =
    useAuth()
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

  // Email upgrade state (anonymous-to-email flow)
  const [upgradeEmail, setUpgradeEmail] = useState('')
  const [upgradeToken, setUpgradeToken] = useState('')
  const [upgradeStep, setUpgradeStep] = useState<'request' | 'verify'>(
    'request',
  )
  const [upgradeIsPending, setUpgradeIsPending] = useState(false)
  const [upgradeSuccessEmail, setUpgradeSuccessEmail] = useState<string | null>(
    null,
  )
  const [upgradeResendCountdown, setUpgradeResendCountdown] = useState(0)
  const upgradeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [notificationForm, setNotificationForm] =
    useState<NotificationPreferences>({
      notifyNewFollower: true,
      notifyQueryFork: true,
      notifyQueryFavorite: true,
      inAppToasts: true,
    })
  const [themePreset, setThemePresetState] = useState<ThemePreset>(() =>
    getThemePreset(),
  )
  const [activePanel, setActivePanel] = useState<AccountPanel>(
    search.panel ?? 'profile',
  )

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

    setFormState(createFormStateFromMe(me))
    setAvatarPreviewFailed(false)
    setFormErrors({})
  }, [me])

  useEffect(() => {
    if (!notificationPreferences) {
      return
    }

    setNotificationForm(notificationPreferences)
  }, [notificationPreferences])

  useEffect(() => {
    const nextPanel = search.panel ?? 'profile'
    setActivePanel((current) => (current === nextPanel ? current : nextPanel))
  }, [search.panel])

  function handlePanelChange(nextPanel: AccountPanel) {
    if (nextPanel === activePanel) {
      return
    }

    setActivePanel(nextPanel)

    void navigate({
      to: '/account',
      search: (current) => ({
        ...current,
        panel: nextPanel === 'profile' ? undefined : nextPanel,
      }),
      replace: true,
    })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!me) {
        throw new Error('missing-profile')
      }

      const initialFormState = createFormStateFromMe(me)
      const changedFields = getChangedFormFields(formState, initialFormState)
      const validation = validateForm(formState, changedFields)
      if (Object.keys(validation).length > 0) {
        setFormErrors(validation)
        throw new Error('validation')
      }

      const trimmedTrainerCode = formState.trainerCode.trim()
      const trimmedPogoUsername = formState.pogoUsername.trim()
      const trimmedAvatarUrl = formState.avatarUrl.trim()
      const levelNumber = Number(formState.level)

      const payload: UpdateMeRequest = {}

      if (changedFields.has('username')) {
        payload.username = formState.username.trim()
      }

      if (changedFields.has('pogoUsername')) {
        payload.pogoUsername = trimmedPogoUsername || undefined
      }

      const shouldFallbackVisibleUsername =
        formState.visibleUsername === 'pogo' && trimmedPogoUsername.length === 0
      if (shouldFallbackVisibleUsername) {
        payload.visibleUsername = 'pokequery'
      } else if (changedFields.has('visibleUsername')) {
        payload.visibleUsername = formState.visibleUsername
      }

      if (changedFields.has('team')) {
        payload.team = formState.team || undefined
      }

      if (changedFields.has('level')) {
        payload.level =
          formState.level.trim().length > 0 && Number.isFinite(levelNumber)
            ? levelNumber
            : undefined
      }

      if (changedFields.has('trainerCode')) {
        payload.trainerCode = trimmedTrainerCode || undefined
      }

      if (changedFields.has('avatarUrl')) {
        payload.avatarUrl = trimmedAvatarUrl || undefined
      }

      if (changedFields.has('isProfilePublic')) {
        payload.isProfilePublic = formState.isProfilePublic
      }

      if (Object.keys(payload).length === 0) {
        return me
      }

      return updateMe(payload)
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

      toast.error(
        getMutationErrorMessage(mutationError, 'Could not save profile.'),
      )
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateMe,
    onSuccess: async () => {
      toast.success('Account deactivated.')
      setDeactivateDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not deactivate account.'),
      )
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: reactivateMe,
    onSuccess: async () => {
      toast.success('Account reactivated.')
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not reactivate account.'),
      )
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
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(mutationError, 'Could not delete account.'),
      )
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
    onError: (mutationError: unknown) => {
      toast.error(
        getMutationErrorMessage(
          mutationError,
          'Could not save notification preferences.',
        ),
      )
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

  const isAnonymousUser = Boolean(user && !user.email)

  useEffect(() => {
    if (upgradeStep !== 'verify' || upgradeResendCountdown <= 0) {
      return
    }

    upgradeTimerRef.current = setInterval(() => {
      setUpgradeResendCountdown((n) => (n > 0 ? n - 1 : 0))
    }, 1000)

    return () => {
      if (upgradeTimerRef.current) {
        clearInterval(upgradeTimerRef.current)
      }
    }
  }, [upgradeStep, upgradeResendCountdown])

  async function handleUpgradeRequest() {
    const email = upgradeEmail.trim()
    if (!email) {
      toast.error('Enter your email address.')
      return
    }

    setUpgradeIsPending(true)
    setUpgradeSuccessEmail(null)
    try {
      await requestAccountUpgrade({ email })
      setUpgradeStep('verify')
      setUpgradeToken('')
      setUpgradeResendCountdown(50)
      toast.success('Check your email for the confirmation code.')
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Could not send OTP.',
      )
    } finally {
      setUpgradeIsPending(false)
    }
  }

  async function handleUpgradeVerify() {
    const token = upgradeToken.trim()
    if (!token) {
      toast.error('Enter the verification code.')
      return
    }

    setUpgradeIsPending(true)
    try {
      await verifyAccountUpgrade({
        email: upgradeEmail.trim(),
        token,
        type: 'email_change',
      })
      // Session is now promoted to email — invalidate /me cache.
      setCachedUser(null)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          ACCOUNT_UPGRADE_SUCCESS_STORAGE_KEY,
          upgradeEmail.trim(),
        )
      }
      toast.success('Email attached. Your account is now secured.')
      setUpgradeSuccessEmail(upgradeEmail.trim())
      setUpgradeStep('request')
      setUpgradeEmail('')
      setUpgradeToken('')
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Could not verify OTP.',
      )
    } finally {
      setUpgradeIsPending(false)
    }
  }

  async function handleUpgradeResend() {
    if (upgradeIsPending || upgradeResendCountdown > 0) return
    const email = upgradeEmail.trim()
    if (!email) return

    setUpgradeIsPending(true)
    try {
      await requestAccountUpgrade({ email })
      setUpgradeResendCountdown(50)
      setUpgradeToken('')
      toast.success('A new confirmation code was sent.')
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Could not resend OTP.',
      )
    } finally {
      setUpgradeIsPending(false)
    }
  }

  function renderUpgradeSection() {
    if (!isAnonymousUser) {
      return null
    }

    return (
      <section className="rounded-2xl border border-amber-300/60 bg-amber-50/60 p-5 dark:border-amber-700/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100">
              Secure your guest account with email
            </h3>
            <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">
              Attach an email so you can recover this account on another device
              and sign back in after your current session ends.
            </p>
          </div>
        </div>

        {upgradeStep === 'request' ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5 sm:flex-1">
              <label htmlFor="upgrade-email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="upgrade-email"
                type="email"
                value={upgradeEmail}
                onChange={(e) => setUpgradeEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUpgradeRequest()
                }}
              />
            </div>
            <Button
              type="button"
              className="rounded-xl sm:shrink-0"
              disabled={upgradeIsPending}
              onClick={() => void handleUpgradeRequest()}
            >
              {upgradeIsPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">
                Enter the code sent to{' '}
                <span className="font-semibold">{upgradeEmail}</span>
              </p>
              <InputOTP
                maxLength={6}
                value={upgradeToken}
                onChange={setUpgradeToken}
                onComplete={() => void handleUpgradeVerify()}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="rounded-xl"
                disabled={upgradeIsPending}
                onClick={() => void handleUpgradeVerify()}
              >
                {upgradeIsPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                Verify and secure account
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-sm"
                disabled={upgradeIsPending || upgradeResendCountdown > 0}
                onClick={() => void handleUpgradeResend()}
              >
                {upgradeResendCountdown > 0
                  ? `Resend in ${upgradeResendCountdown}s`
                  : 'Resend code'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-sm"
                onClick={() => {
                  setUpgradeStep('request')
                  setUpgradeToken('')
                }}
              >
                Change email
              </Button>
            </div>
          </div>
        )}
      </section>
    )
  }

  function handleThemePresetChange(nextPreset: ThemePreset) {
    if (nextPreset === themePreset) {
      return
    }

    setThemePresetState(nextPreset)
    setThemePreset(nextPreset)
    toast.success('Theme updated.')
  }

  function handleGenerateAvatar() {
    const seed = createAvatarSeed(formState.username)
    const style =
      DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)]

    handleChange('avatarUrl', buildDiceBearAvatarUrl(style, seed))
    toast.success('Generated a random DiceBear avatar URL.')
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
        <div className="space-y-8">
          {upgradeSuccessEmail ? (
            <section className="rounded-2xl border border-emerald-300/70 bg-emerald-50/70 p-5 dark:border-emerald-700/40 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
                    Account upgraded successfully
                  </h3>
                  <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-200/80">
                    {upgradeSuccessEmail} is now linked to this account. Your
                    existing strings and activity stayed with the same profile.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

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

          <div
            role="tablist"
            aria-label="Account sections"
            className="grid gap-2 rounded-2xl border border-border/70 bg-card/95 p-2 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              {
                key: 'profile' as const,
                label: 'Profile',
                description: 'Identity and privacy',
              },
              {
                key: 'theme' as const,
                label: 'Theme',
                description: 'Visual preference',
              },
              {
                key: 'notifications' as const,
                label: 'Notifications',
                description: 'Alerts and toasts',
              },
              {
                key: 'danger' as const,
                label: 'Danger Zone',
                description: 'Deactivate or delete',
              },
            ].map((panel) => (
              <button
                key={panel.key}
                type="button"
                role="tab"
                aria-selected={activePanel === panel.key}
                aria-controls={`account-panel-${panel.key}`}
                className={`rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  activePanel === panel.key
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border/70 bg-background hover:bg-muted'
                }`}
                onClick={() => handlePanelChange(panel.key)}
              >
                <p className="text-sm font-semibold">{panel.label}</p>
                <p className="text-xs text-muted-foreground">
                  {panel.description}
                </p>
              </button>
            ))}
          </div>

          {activePanel === 'profile' ? (
            <section
              id="account-panel-profile"
              role="tabpanel"
              className="rounded-2xl border border-border/70 bg-card/95 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Profile Details</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your PokeQuery username is your public app identity and can
                    be different from your Pokemon GO trainer name.
                  </p>
                </div>

                <div className="ml-auto flex flex-row items-center justify-end gap-2 self-start">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setFormState(createFormStateFromMe(me))
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
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    PokeQuery Username
                  </span>
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

                <div className="flex flex-col gap-1.5">
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
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={handleGenerateAvatar}
                    >
                      Random DiceBear avatar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Want a specific look? Pick a style in{' '}
                    <a
                      href="https://www.dicebear.com/playground/"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline underline-offset-2"
                    >
                      DiceBear Playground
                    </a>
                    .
                  </p>
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
                    <label className="flex flex-col gap-1.5 md:col-span-2">
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
                        Optional, but required if you want to show your Pokemon
                        GO name publicly.
                      </p>
                      {formErrors.pogoUsername ? (
                        <p className="text-xs text-destructive">
                          {formErrors.pogoUsername}
                        </p>
                      ) : null}
                    </label>

                    <label className="flex flex-col gap-1.5">
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

                    <label className="flex flex-col gap-1.5">
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

                    <label className="flex flex-col gap-1.5 md:col-span-2">
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
                    ? 'mt-6 rounded-xl border border-sky-300/80 bg-sky-500/10 p-4 dark:border-sky-500/40 dark:bg-sky-500/20'
                    : 'mt-6 rounded-xl border border-slate-300/80 bg-slate-500/10 p-4 dark:border-slate-500/40 dark:bg-slate-500/20'
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
                    aria-pressed={formState.isProfilePublic}
                    className={[
                      'max-sm:w-full',
                      formState.isProfilePublic
                        ? 'rounded-xl border-sky-300/80 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 dark:border-sky-500/50 dark:bg-sky-500/20 dark:text-sky-200 dark:hover:bg-sky-500/30'
                        : 'rounded-xl border-slate-300/80 bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:border-slate-500/50 dark:bg-slate-500/20 dark:text-slate-200 dark:hover:bg-slate-500/30',
                    ].join(' ')}
                    onClick={() =>
                      handleChange(
                        'isProfilePublic',
                        !formState.isProfilePublic,
                      )
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
            </section>
          ) : null}

          {activePanel === 'theme' ? (
            <section
              id="account-panel-theme"
              role="tabpanel"
              className="rounded-2xl border border-border/70 bg-card/95 p-5"
            >
              <h3 className="text-base font-semibold">Theme</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a color preset for your app experience. This preference
                is saved in your browser.
              </p>

              <div
                className="mt-5 grid gap-3 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Theme preset"
              >
                {THEME_PRESET_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={themePreset === option.value}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 max-sm:w-full max-sm:text-left sm:text-center ${
                      themePreset === option.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border/70 bg-background hover:bg-muted'
                    }`}
                    onClick={() => handleThemePresetChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activePanel === 'notifications' ? (
            <section
              id="account-panel-notifications"
              role="tabpanel"
              className="rounded-2xl border border-border/70 bg-card/95 p-5"
            >
              <h3 className="text-base font-semibold">
                Notification Preferences
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose which activity should notify you and whether
                high-priority events should appear as in-app toasts.
              </p>

              <div className="mt-5 grid gap-4">
                <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3 max-sm:flex-col">
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
                    className="mt-0.5 size-4 accent-primary max-sm:self-start"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3 max-sm:flex-col">
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
                    className="mt-0.5 size-4 accent-primary max-sm:self-start"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3 max-sm:flex-col">
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
                    className="mt-0.5 size-4 accent-primary max-sm:self-start"
                  />
                </label>

                <label className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3 max-sm:flex-col">
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
                    className="mt-0.5 size-4 accent-primary max-sm:self-start"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  className="rounded-xl max-sm:w-full"
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
          ) : null}

          {activePanel === 'danger' ? (
            <section
              id="account-panel-danger"
              role="tabpanel"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
            >
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
          ) : null}

          {renderUpgradeSection()}
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

function createFormStateFromMe(me: GetMeResponse): FormState {
  return {
    username: me.username,
    pogoUsername: me.pogoUsername ?? '',
    visibleUsername: me.visibleUsername,
    team: me.team ?? '',
    level: me.level !== null ? String(me.level) : '',
    trainerCode: me.trainerCode ?? '',
    avatarUrl: me.avatarUrl ?? '',
    isProfilePublic: me.isProfilePublic,
  }
}

function getChangedFormFields(
  current: FormState,
  baseline: FormState,
): Set<keyof FormState> {
  const changed = new Set<keyof FormState>()

  ;(Object.keys(current) as (keyof FormState)[]).forEach((key) => {
    if (current[key] !== baseline[key]) {
      changed.add(key)
    }
  })

  return changed
}

function validateForm(
  state: FormState,
  fieldsToValidate?: Set<keyof FormState>,
): FormErrors {
  const errors: FormErrors = {}
  const shouldValidate = (field: keyof FormState) =>
    !fieldsToValidate || fieldsToValidate.has(field)

  const username = state.username.trim()
  if (
    shouldValidate('username') &&
    (username.length < 3 || username.length > 20)
  ) {
    errors.username = 'Username must be 3-20 characters.'
  } else if (shouldValidate('username') && !USERNAME_PATTERN.test(username)) {
    errors.username = 'Use letters, numbers, and underscores only.'
  } else if (shouldValidate('username') && findBlockedTerm(username)) {
    errors.username = 'Username contains blocked language.'
  }

  if (shouldValidate('level') && state.level.trim().length > 0) {
    const levelValue = Number(state.level)
    if (!Number.isInteger(levelValue) || levelValue < 1 || levelValue > 50) {
      errors.level = 'Level must be an integer between 1 and 50.'
    }
  }

  const trainerCode = state.trainerCode.trim()
  if (
    shouldValidate('trainerCode') &&
    trainerCode.length > 0 &&
    !TRAINER_CODE_PATTERN.test(trainerCode)
  ) {
    errors.trainerCode = 'Enter a valid 12-digit trainer code.'
  }

  const avatarUrl = state.avatarUrl.trim()
  if (shouldValidate('avatarUrl') && avatarUrl.length > 0) {
    try {
      new URL(avatarUrl)
    } catch {
      errors.avatarUrl = 'Avatar URL must be a valid URL.'
    }
  }

  const pogoUsername = state.pogoUsername.trim()
  if (shouldValidate('pogoUsername') && pogoUsername.length > 0) {
    if (pogoUsername.length < 3 || pogoUsername.length > 30) {
      errors.pogoUsername = 'Pokemon GO username must be 3-30 characters.'
    } else if (!POGO_USERNAME_PATTERN.test(pogoUsername)) {
      errors.pogoUsername =
        'Use letters, numbers, spaces, dots, underscores, or dashes only.'
    } else if (findBlockedTerm(pogoUsername)) {
      errors.pogoUsername = 'Pokemon GO username contains blocked language.'
    }
  }

  return errors
}

function createAvatarSeed(username: string): string {
  const normalizedUsername = username.trim().toLowerCase() || 'trainer'
  const entropy = Math.random().toString(36).slice(2, 10)
  return `${normalizedUsername}-${Date.now().toString(36)}-${entropy}`
}

function buildDiceBearAvatarUrl(
  style: (typeof DICEBEAR_STYLES)[number],
  seed: string,
): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
}
