export type DexConversionDirection = 'numbers-to-names' | 'names-to-numbers'

export type DexPokemonEntry = {
  id: number
  name: string
}

const TOKEN_DELIMITER_CLASS = '[\\s,*!()#&/]'
const NUMBER_TOKEN_PATTERN = new RegExp(
  `(^|${TOKEN_DELIMITER_CLASS})(\\d{1,4})(?=$|${TOKEN_DELIMITER_CLASS})`,
  'gi',
)

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizePokemonName(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function buildPokemonAliases(name: string): string[] {
  const normalizedName = normalizePokemonName(name)
  const compact = normalizeLookupKey(normalizedName)
  const segments = normalizedName
    .split(/[^a-z0-9]+/g)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const aliases = new Set<string>([normalizedName, compact])

  if (segments.length > 1) {
    aliases.add(segments.join(' '))
    aliases.add(segments.join('-'))
  }

  return [...aliases].filter(Boolean)
}

function buildLookup(entries: DexPokemonEntry[]) {
  const numberToName = new Map<number, string>()
  const nameToNumber = new Map<string, number>()

  for (const entry of entries) {
    if (!Number.isFinite(entry.id) || entry.id <= 0) {
      continue
    }

    const normalizedName = normalizePokemonName(entry.name)
    if (!normalizedName) {
      continue
    }

    numberToName.set(entry.id, normalizedName)

    for (const alias of buildPokemonAliases(normalizedName)) {
      nameToNumber.set(alias, entry.id)
    }
  }

  const namePattern = Array.from(nameToNumber.keys())
    .sort((left, right) => right.length - left.length)
    .map(escapeRegex)
    .join('|')

  return {
    namePattern,
    nameToNumber,
    numberToName,
  }
}

export function convertDexStringWithStats(
  input: string,
  entries: DexPokemonEntry[],
  direction: DexConversionDirection,
): { output: string; conversions: number } {
  if (!input) {
    return {
      output: '',
      conversions: 0,
    }
  }

  const lookup = buildLookup(entries)

  if (direction === 'numbers-to-names') {
    let conversions = 0
    const output = input.replace(
      NUMBER_TOKEN_PATTERN,
      (match, prefix, value) => {
        const mappedName = lookup.numberToName.get(Number(value))

        if (!mappedName) {
          return match
        }

        conversions += 1
        return `${prefix}${mappedName}`
      },
    )

    return {
      output,
      conversions,
    }
  }

  if (!lookup.namePattern) {
    return {
      output: input,
      conversions: 0,
    }
  }

  const namePattern = new RegExp(
    `(^|${TOKEN_DELIMITER_CLASS})(${lookup.namePattern})(?=$|${TOKEN_DELIMITER_CLASS})`,
    'gi',
  )

  let conversions = 0
  const output = input.replace(namePattern, (match, prefix, value) => {
    const normalizedValue = normalizePokemonName(value)
    const mappedNumber =
      lookup.nameToNumber.get(normalizedValue) ??
      lookup.nameToNumber.get(normalizeLookupKey(normalizedValue))

    if (!mappedNumber) {
      return match
    }

    conversions += 1
    return `${prefix}${mappedNumber}`
  })

  return {
    output,
    conversions,
  }
}

export function convertDexString(
  input: string,
  entries: DexPokemonEntry[],
  direction: DexConversionDirection,
): string {
  return convertDexStringWithStats(input, entries, direction).output
}
