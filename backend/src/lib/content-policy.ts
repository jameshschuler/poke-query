import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export function findBlockedTerm(value: string) {
  const match = matcher.getAllMatches(value, true)[0];

  if (!match) {
    return null;
  }

  const payload = englishDataset.getPayloadWithPhraseMetadata(match);
  if (payload.phraseMetadata) {
    return payload.phraseMetadata.originalWord;
  }

  return "blocked language";
}
