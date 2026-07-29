type PublicProfileInput = {
  team: string | null;
  level: number | null;
  trainerCode: string | null;
  isProfilePublic: boolean;
};

type DisplayNameInput = {
  username: string;
  pogoUsername: string | null;
  visibleUsername: string | null;
};

type ProfileCompletionInput = {
  hasTrainer: boolean;
  username: string;
  team: string | null;
  level: number | null;
  trainerCode: string | null;
};

export function normalizeTrainerCode(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 12) {
    return value;
  }

  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

export function toPublicTrainerProfile(row: PublicProfileInput): {
  team: "mystic" | "valor" | "instinct" | null;
  level: number | null;
  trainerCode: string | null;
} {
  return {
    team: row.isProfilePublic ? (row.team as "mystic" | "valor" | "instinct" | null) : null,
    level: row.isProfilePublic ? row.level : null,
    trainerCode: row.isProfilePublic ? row.trainerCode : null,
  };
}

export function resolveDisplayName(row: DisplayNameInput): string {
  if (row.visibleUsername === "pogo" && row.pogoUsername?.trim()) {
    return row.pogoUsername.trim();
  }

  return row.username;
}

export function normalizeAuthEmail(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

export function isProfileCompleted(profile: ProfileCompletionInput): boolean {
  return (
    profile.hasTrainer &&
    profile.username.trim().length >= 3 &&
    profile.team !== null &&
    profile.level !== null &&
    profile.trainerCode !== null
  );
}
