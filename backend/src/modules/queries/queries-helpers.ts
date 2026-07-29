export function hasRowsArray(value: unknown): value is { rows: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "rows" in value &&
    Array.isArray((value as { rows?: unknown }).rows)
  );
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeReferenceUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  return hasScheme ? trimmed : `https://${trimmed}`;
}

export function isValidReferenceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getReferenceDomainTag(referenceUrl: string | undefined): string | undefined {
  if (!referenceUrl) {
    return undefined;
  }

  try {
    const hostname = new URL(referenceUrl).hostname.toLowerCase();
    if (!hostname || hostname === "localhost") {
      return undefined;
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
      return undefined;
    }

    const normalizedHost = hostname.replace(/^www\d*\./, "");
    const labels = normalizedHost.split(".").filter(Boolean);
    if (labels.length === 0) {
      return undefined;
    }

    const secondLevelTlds = new Set([
      "ac.uk",
      "co.jp",
      "co.nz",
      "co.uk",
      "com.au",
      "com.br",
      "gov.uk",
      "net.au",
      "org.au",
      "org.uk",
    ]);

    let candidate = labels[0] ?? "";
    if (labels.length >= 2) {
      const suffix = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
      candidate =
        labels.length >= 3 && secondLevelTlds.has(suffix)
          ? (labels[labels.length - 3] ?? "")
          : (labels[labels.length - 2] ?? "");
    }

    if (!candidate) {
      return undefined;
    }

    const cleaned = candidate.replace(/[^a-z0-9-]/g, "").trim();
    return cleaned || undefined;
  } catch {
    return undefined;
  }
}

export function resolveDisplayName(row: {
  username: string;
  pogoUsername: string | null;
  visibleUsername: string | null;
}): string {
  if (row.visibleUsername === "pogo" && row.pogoUsername?.trim()) {
    return row.pogoUsername.trim();
  }

  return row.username;
}

export function resolveMetadataSource(value: unknown): "official" | "community" {
  return value === "official" ? "official" : "community";
}

export function isOfficialQueryEditorUser(userId: string): boolean {
  const configured =
    process.env.OFFICIAL_QUERY_EDITOR_USER_IDS ??
    process.env.MODERATION_REVIEWER_USER_IDS ??
    process.env.MODERATOR_USER_IDS ??
    "";

  return new Set(
    configured
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  ).has(userId);
}
