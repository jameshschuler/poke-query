import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity'

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

export function findBlockedTerm(value: string) {
  const matches = matcher.getAllMatches(value, true)

  if (matches.length === 0) {
    return null
  }

  const match = matches[0]
  const payload = englishDataset.getPayloadWithPhraseMetadata(match)
  const phraseMetadata = (
    payload as { phraseMetadata?: { originalWord?: string } }
  ).phraseMetadata

  if (phraseMetadata?.originalWord) {
    return phraseMetadata.originalWord
  }

  return 'blocked language'
}
