export interface FuzzyParts {
  label: string;
  detail?: string;
  keywords?: string;
}

export function scoreFuzzy(query: string, parts: FuzzyParts): number | null {
  const normalized = normalize(query);
  if (!normalized) return 0;

  const labelScore = scoreText(normalized, parts.label);
  const detailScore = scoreText(normalized, parts.detail ?? "");
  const keywordScore = scoreText(normalized, parts.keywords ?? "");
  const scores = [
    labelScore === null ? null : labelScore * 4,
    detailScore === null ? null : detailScore * 2,
    keywordScore
  ].filter((score): score is number => score !== null);

  if (!scores.length) return null;
  return Math.max(...scores);
}

function scoreText(query: string, text: string): number | null {
  const haystack = normalize(text);
  if (!haystack) return null;

  let queryIndex = 0;
  let score = 0;
  let contiguousRun = 0;

  for (let index = 0; index < haystack.length && queryIndex < query.length; index += 1) {
    if (haystack[index] !== query[queryIndex]) {
      contiguousRun = 0;
      continue;
    }

    const boundary = index === 0 || haystack[index - 1] === " ";
    contiguousRun += 1;
    score += 1 + contiguousRun * 2;
    if (boundary) score += index === 0 ? 8 : 5;
    queryIndex += 1;
  }

  if (queryIndex !== query.length) return null;
  return score;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
