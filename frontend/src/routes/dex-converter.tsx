import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { PageShell } from '#/components/page-shell'
import { Button } from '#/components/ui/button'
import {
  convertDexStringWithStats,
  type DexConversionDirection,
  type DexPokemonEntry,
} from '#/lib/dex-string-converter'

type PokeApiPokemonListResponse = {
  results: Array<{
    name: string
    url: string
  }>
}

export const Route = createFileRoute('/dex-converter')({
  ssr: false,
  component: DexConverterPage,
})

async function fetchPokemonEntries(
  signal: AbortSignal,
): Promise<DexPokemonEntry[]> {
  const response = await fetch(
    'https://pokeapi.co/api/v2/pokemon-species?limit=2000',
    {
      signal,
    },
  )

  if (!response.ok) {
    throw new Error('Could not load Pokemon names from PokeAPI.')
  }

  const data = (await response.json()) as PokeApiPokemonListResponse

  return data.results
    .map((pokemon) => {
      const segments = pokemon.url.split('/').filter(Boolean)
      const id = Number(segments[segments.length - 1])

      if (!Number.isFinite(id)) {
        return null
      }

      return {
        id,
        name: pokemon.name,
      }
    })
    .filter((entry): entry is DexPokemonEntry => entry !== null)
    .sort((left, right) => left.id - right.id)
}

function DexConverterPage() {
  const [direction, setDirection] =
    useState<DexConversionDirection>('numbers-to-names')
  const [inputText, setInputText] = useState('')

  const {
    data: pokemon = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['dex-pokemon'],
    queryFn: ({ signal }) => fetchPokemonEntries(signal),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })

  const conversionResult = useMemo(
    () => convertDexStringWithStats(inputText, pokemon, direction),
    [direction, inputText, pokemon],
  )

  const canConvert = pokemon.length > 0 && inputText.trim().length > 0

  return (
    <PageShell
      title="Dex String Converter"
      subtitle="Convert standalone Pokemon names and dex numbers inside search strings."
      contentHeaderVariant="floating"
      showSidebar
      showHeaderSearch={false}
      headerControls={
        <Button
          nativeButton={false}
          variant="outline"
          className="rounded-xl"
          render={<Link to="/discover" />}
        >
          Back to Discover
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
          <div className="inline-flex rounded-full border border-border/70 bg-background p-1 text-sm">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                direction === 'numbers-to-names'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setDirection('numbers-to-names')}
            >
              Numbers → names
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                direction === 'names-to-numbers'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setDirection('names-to-numbers')}
            >
              Names → numbers
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Input string</span>
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="Paste a search string"
              className="min-h-52 w-full resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 font-mono text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </label>

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setInputText('')}
            >
              Clear
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Output
            </h2>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? 'Loading PokeAPI...'
                : isError
                  ? 'PokeAPI unavailable'
                  : `${conversionResult.conversions} replacements`}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background p-4">
            <pre className="min-h-52 whitespace-pre-wrap wrap-break-word font-mono text-sm text-foreground/90">
              {canConvert
                ? conversionResult.output
                : 'Converted text will appear here.'}
            </pre>
          </div>

          <p className="text-xs text-muted-foreground">
            Converts standalone names and dex numbers only. Patterns like cp1500
            and 0-1attack stay unchanged.
          </p>
        </section>
      </div>
    </PageShell>
  )
}
