function stripNoise(title: string): string {
  return title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(vol\.?|volume|tomo|n[ºo°]?)\s*\d+\b/gi, " ")
    .replace(/[-–—:|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function tryOpenLibrary(q: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { docs?: Array<{ cover_i?: number }> };
    const coverId = json.docs?.find((d) => d.cover_i)?.cover_i;
    // -L gives ~600px wide covers, no rate limit
    return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
  } catch {
    return null;
  }
}

async function tryGoogleBooks(q: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{
        volumeInfo?: {
          imageLinks?: {
            extraLarge?: string;
            large?: string;
            medium?: string;
            thumbnail?: string;
            smallThumbnail?: string;
          };
        };
      }>;
    };
    const links = json.items?.[0]?.volumeInfo?.imageLinks;
    if (!links) return null;
    const url = links.extraLarge ?? links.large ?? links.medium ?? links.thumbnail ?? links.smallThumbnail;
    if (!url) return null;
    return url
      .replace(/^http:/, "https:")
      .replace(/&edge=curl/, "")
      .replace(/&zoom=\d+/, "&zoom=0")
      .replace(/&imgtk=[^&]+/, "");
  } catch {
    return null;
  }
}

export async function searchCover(title: string): Promise<string | null> {
  if (!title.trim()) return null;
  const stripped = stripNoise(title);

  // Open Library first — no rate limits, good resolution (-L = ~600px)
  const olCover =
    (await tryOpenLibrary(title)) ?? (await tryOpenLibrary(stripped));
  if (olCover) return olCover;

  // Google Books as fallback (has daily quota limits without API key)
  const gbCover =
    (await tryGoogleBooks(title)) ?? (await tryGoogleBooks(stripped));
  if (gbCover) return gbCover;

  return null;
}
