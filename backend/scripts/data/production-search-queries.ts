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
    key: "shundo",
    title: "Shundo",
    query: "shiny&4*",
    description: "Shiny and perfect IVs",
    source: "official",
    isPublic: true,
  },
  {
    key: "nundo",
    title: "Nundo",
    query: "0attack&0defense&0health",
    description: "All zero IVs (0/0/0)",
    source: "official",
    isPublic: true,
  }
];
