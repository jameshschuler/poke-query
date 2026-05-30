export interface QueryMetadata {
  autoTags: string[];
  complexity: "simple" | "advanced";
  recommendsEvolution: boolean;
  leagues: ("Great" | "Ultra" | "Master")[];
}

export function generateMetadata(query: string): QueryMetadata {
  const q = query.toLowerCase();
  const tags = new Set<string>();
  const leagues: ("Great" | "Ultra" | "Master")[] = [];

  // 1. IV Sniffing
  if (q.includes("4*") || q.includes("3*")) tags.add("high-iv");
  if (q.includes("0*")) tags.add("nundo-hunt");

  // 2. League Sniffing (CP Caps)
  if (/cp-1[45]00/.test(q)) {
    tags.add("pvp");
    leagues.push("Great");
    tags.add("great-league");
  }
  if (/cp-2[45]00/.test(q)) {
    tags.add("pvp");
    leagues.push("Ultra");
    tags.add("ultra-league");
  }
  if (q.includes("cp2500-")) {
    tags.add("pvp");
    leagues.push("Master");
    tags.add("master-league");
  }

  // 3. Move/Type Sniffing
  if (q.includes("@special") || q.includes("@move")) tags.add("legacy-moves");
  if (q.includes("!")) tags.add("exclusion-filter");

  // 5. Raid Sniffing
  // Add 'raid' if query contains common raid-related keywords
  if (q.includes("raid") || q.includes("@move") || q.includes("@special") || q.includes("type:")) {
    tags.add("raid");
  }

  // 4. Activity Sniffing
  if (q.includes("evolve")) tags.add("mass-evolve");
  if (q.includes("distance")) tags.add("distance-trade");
  if (q.includes("age0")) tags.add("daily-catch");

  return {
    autoTags: Array.from(tags),
    complexity: q.length > 50 || q.includes("&") || q.includes("|") ? "advanced" : "simple",
    recommendsEvolution: q.includes("evolve"),
    leagues,
  };
}
