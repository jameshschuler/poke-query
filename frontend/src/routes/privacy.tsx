import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'

import { PublicInfoLinks } from '#/components/public-info-links'

export const Route = createFileRoute('/privacy')({
  ssr: false,
  component: PrivacyPage,
})

function PrivacyPage() {
  const contactEmail =
    import.meta.env.VITE_PUBLIC_CONTACT_EMAIL ?? 'support@yourdomain.com'

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="space-y-8 rounded-3xl border border-border/70 bg-card/90 p-6 shadow-sm sm:p-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to home
        </Link>

        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Privacy Policy
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            PokeQuery Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Last updated: 2026-07-18
          </p>
        </header>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          <p>
            This Privacy Policy explains what information PokeQuery collects,
            how it is used, and what choices you have.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">
            Information We Collect
          </h2>
          <p>
            We may collect account information (such as email), profile details
            you choose to share, and content you create in the app (such as
            search strings, forks, favorites, and moderation reports).
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">
            How We Use Information
          </h2>
          <p>
            We use information to operate and improve PokeQuery, keep your
            account secure, provide app features, and support moderation and
            abuse-prevention workflows.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Sharing</h2>
          <p>
            We do not sell personal information. We may share information with
            service providers needed to run the app, and when required by law.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">
            Data Retention
          </h2>
          <p>
            We keep data for as long as needed to provide the service, meet
            legal obligations, resolve disputes, and enforce policies.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">
            Your Choices
          </h2>
          <p>
            You can request account-related changes, including profile updates
            and account deletion, subject to operational and legal constraints.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p>
            If you have questions about this Privacy Policy, contact:
            {contactEmail}.
          </p>
        </section>

        <PublicInfoLinks />
      </div>
    </main>
  )
}
