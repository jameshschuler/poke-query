import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'

import { PublicInfoLinks } from '#/components/public-info-links'

export const Route = createFileRoute('/terms')({
  ssr: false,
  component: TermsPage,
})

function TermsPage() {
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
            Terms of Service
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            PokeQuery Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Last updated: 2026-07-18
          </p>
        </header>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Acceptance</h2>
          <p>
            By accessing or using PokeQuery, you agree to be bound by these
            Terms of Service and to comply with all applicable laws and
            regulations.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">
            User Content
          </h2>
          <p>
            You retain ownership of content you submit, including search strings
            and related metadata. By submitting content, you grant PokeQuery a
            non-exclusive license to host, process, and display such content as
            necessary to operate and improve the service.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">
            Community Safety
          </h2>
          <p>
            Content that violates applicable law or platform policy may be
            restricted or removed. Repeated or severe violations may result in
            temporary or permanent account limitations.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">
            Availability
          </h2>
          <p>
            PokeQuery is provided on an as-available basis. While we work to
            maintain reliability and security, uninterrupted availability is not
            guaranteed.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Liability</h2>
          <p>
            To the maximum extent permitted by law, PokeQuery is provided
            without warranties of any kind. PokeQuery will not be liable for
            indirect, incidental, special, or consequential damages.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Changes</h2>
          <p>
            We may update these Terms of Service from time to time. Continued
            use of PokeQuery after changes become effective constitutes
            acceptance of the revised terms.
          </p>
        </section>

        <section className="space-y-3 text-sm text-muted-foreground sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p>For questions regarding these terms, contact: {contactEmail}.</p>
        </section>

        <PublicInfoLinks />
      </div>
    </main>
  )
}
