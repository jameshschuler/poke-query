import { describe, expect, it } from 'vitest'

import {
  convertDexString,
  convertDexStringWithStats,
} from '#/lib/dex-string-converter'
import type { DexPokemonEntry } from '#/lib/dex-string-converter'

const pokemon: DexPokemonEntry[] = [
  { id: 1, name: 'bulbasaur' },
  { id: 2, name: 'ivysaur' },
  { id: 3, name: 'venusaur' },
  { id: 150, name: 'mewtwo' },
]

describe('dex string converter', () => {
  it('converts standalone dex numbers to pokemon names', () => {
    expect(
      convertDexString('1, 2, 3&!cp1500', pokemon, 'numbers-to-names'),
    ).toBe('bulbasaur, ivysaur, venusaur&!cp1500')
  })

  it('converts pokemon names to dex numbers', () => {
    expect(
      convertDexString(
        'bulbasaur, ivysaur, venusaur',
        pokemon,
        'names-to-numbers',
      ),
    ).toBe('1, 2, 3')
  })

  it('accepts spacing and punctuation aliases when converting names to numbers', () => {
    expect(
      convertDexString(
        'mr mime, ho-oh',
        [...pokemon, { id: 122, name: 'mr-mime' }, { id: 250, name: 'ho-oh' }],
        'names-to-numbers',
      ),
    ).toBe('122, 250')
  })

  it('does not convert numbers inside search filters', () => {
    expect(
      convertDexString(
        '0-1attack&3-4defense&3-4hp&!#',
        pokemon,
        'numbers-to-names',
      ),
    ).toBe('0-1attack&3-4defense&3-4hp&!#')
  })

  it('reports conversion counts', () => {
    expect(
      convertDexStringWithStats('1, 2, 3', pokemon, 'numbers-to-names'),
    ).toEqual({
      output: 'bulbasaur, ivysaur, venusaur',
      conversions: 3,
    })
  })
})
