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
  },
  {
    key: "green-shinies",
    title: "Green Shiny Pokémon",
    query: "shiny&10,12,23,30,42,66-68,88,114,138,140,150,165,167,179,180,187-189,196,204,217,226,234,240,246,251,252,255,270,278,279,304,307,309,316,331,343,353,371,383,401,438,453,495,501,511,546,550,587,610,631,633,669,674,708,731,753,810,813,831,840",
    description: "Filters for shiny Pokémon with prominent green color palettes",
    source: "official",
    isPublic: true
  },
  {
    key: "black-shinies",
    title: "Black & Dark Shiny Pokémon",
    query: "shiny&006,038,091,211,212,215,229,282,334,355,384,403,404,405,448,491,559,570,571,612,625,658,715,758,778,804,821,822,823,887,908",
    description: "Filters for shiny Pokémon with black or dark gray color palettes",
    source: "official",
    isPublic: true
  }
];
