import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { login, verify } from '#/lib/poke-query-api'
import { requireGuest } from '#/lib/route-auth'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    await requireGuest()
  },
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()

  const [email, setEmail] = React.useState('')
  const [token, setToken] = React.useState('')
  const [isCodeSent, setIsCodeSent] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const nextPath = search.redirect?.startsWith('/')
    ? search.redirect
    : '/dashboard'

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login({ email })
      setIsCodeSent(true)
    } catch {
      setError('Unable to send login code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await verify({ email, token })
      await navigate({ to: nextPath })
    } catch {
      setError('Invalid code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--accent)_22%,transparent),transparent_45%),linear-gradient(180deg,_var(--background)_0%,_color-mix(in_oklab,var(--background)_82%,var(--secondary))_100%)] px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Card className="border-border/70 bg-card/80 shadow-lg backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your email to receive a one-time code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-3" onSubmit={handleSendCode}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="trainer@example.com"
                required
              />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Sending...' : 'Send Login Code'}
              </Button>
            </form>

            {isCodeSent ? (
              <form className="space-y-3" onSubmit={handleVerify}>
                <Label htmlFor="token">Verification Code</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="123456"
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify And Continue'}
                </Button>
              </form>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
