import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@authabase/react'
import { useEffect, useMemo, useState } from 'react'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

type AuthMode = 'login' | 'signup'

function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { user, isLoading, supabase } = useAuth()
  const redirectTo = useMemo(
    () => search.redirect ?? '/dashboard',
    [search.redirect],
  )
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: redirectTo, replace: true })
    }
  }, [isLoading, user, navigate, redirectTo])

  if (isLoading) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!supabase) {
      setError('Authentication service is unavailable. Please try again.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw signInError
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          throw signUpError
        }

        setSuccess('Account created. Check your email to verify your account.')
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to complete authentication request.'

      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-hidden="true">
        <p className="login-hero-brand">POKEQUERY</p>
        <h1 className="login-hero-title">
          Build and share
          <br />
          Pokemon GO
          <br />
          search strings.
        </h1>
        <p className="login-hero-copy">
          Create powerful search strings, discover what the community has built,
          and fork anything to make it your own.
        </p>
        <div className="login-hero-stats">
          <div>
            <strong>2,400+</strong>
            <span>Strings</span>
          </div>
          <div>
            <strong>800+</strong>
            <span>Trainers</span>
          </div>
          <div>
            <strong>12k</strong>
            <span>Copies</span>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-shell">
          <div
            className="login-mode-switch"
            role="tablist"
            aria-label="Auth mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => {
                setMode('login')
                setError(null)
                setSuccess(null)
              }}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => {
                setMode('signup')
                setError(null)
                setSuccess(null)
              }}
            >
              Sign up
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {error ? (
              <p className="login-form-message is-error">{error}</p>
            ) : null}
            {success ? (
              <p className="login-form-message is-success">{success}</p>
            ) : null}

            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                placeholder="********"
                required
              />
            </div>

            {mode === 'signup' ? (
              <div className="login-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="********"
                  required
                />
              </div>
            ) : null}

            <button
              className="login-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === 'login'
                  ? 'Logging in...'
                  : 'Creating account...'
                : mode === 'login'
                  ? 'Log in'
                  : 'Create account'}
            </button>

            {mode === 'login' ? (
              <p className="login-forgot-password">Forgot password?</p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  )
}
