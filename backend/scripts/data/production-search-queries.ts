export type ProductionSeedQuery = {
  key: string;
  title: string;
  query: string;
  description: string;
  source?: "official" | "community";
  tags?: string[];
  isPublic?: boolean;
  copyCount?: number;
};

// Hand-maintained production seed strings.
// Update this list directly when you want to curate production defaults.
export const productionSeedQueries: ProductionSeedQuery[] = [
  {
    key: "official-great-league-core",
    title: "Official: Great League Core",
    query: "cp-1500&3*,4*&!shadow",
    description: "Core Great League picks curated by the PokeQuery team.",
    source: "official",
    tags: ["great-league", "pvp", "core"],
    isPublic: true,
    copyCount: 0,
  },
  {
    key: "official-ultra-league-staples",
    title: "Official: Ultra League Staples",
    query: "cp-2500&!legendary&!mythical",
    description: "Stable Ultra League options to start from.",
    source: "official",
    tags: ["ultra-league", "pvp", "staples"],
    isPublic: true,
    copyCount: 0,
  },
  {
    key: "official-master-league-meta",
    title: "Official: Master League Meta",
    query: "cp-4000+&legendary&!mythical",
    description: "Top-end Master League candidates.",
    source: "official",
    tags: ["master-league", "pvp", "meta"],
    isPublic: true,
    copyCount: 0,
  },
  {
    key: "official-raid-dragon-counters",
    title: "Official: Raid Dragon Counters",
    query: "@move&type:dragon&3*,4*",
    description: "Reliable dragon raid counter shortlist.",
    source: "official",
    tags: ["raid", "dragon", "counters"],
    isPublic: true,
    copyCount: 0,
  },
  {
    key: "official-community-day-keepers",
    title: "Official: Community Day Keepers",
    query: "age0-2&3*,4*&!transfer",
    description: "Quick keep-or-transfer pass for event catches.",
    source: "official",
    tags: ["community-day", "utility", "keepers"],
    isPublic: true,
    copyCount: 0,
  },
  {
    key: "community-daily-cleanup",
    title: "Community Curated: Daily Cleanup",
    query: "age0&!favorite&!shiny",
    description: "Community-curated cleanup baseline for daily catches.",
    source: "community",
    tags: ["daily-catch", "cleanup", "utility"],
    isPublic: true,
    copyCount: 0,
  },
];
