import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchCover } from "./openlibrary";

const InputSchema = z.object({
  title: z.string().min(1).max(300),
});

export type PriceResult = {
  current_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  price_source: string | null;
  affiliate_url: string | null;
  cover_url: string | null;
};

type ShoppingResult = {
  title?: string;
  price?: string;
  extracted_price?: number;
  old_price?: string;
  extracted_old_price?: number;
  source?: string;
  link?: string;
  product_link?: string;
  thumbnail?: string;
  thumbnails?: string[];
  serpapi_thumbnail?: string;
  serpapi_thumbnails?: string[];
  extensions?: string[];
  snippet?: string;
};

const DIGITAL_RE =
  /\b(kindle|e-?book|ebook|digital|pdf|epub|mobi|kobo|audible|audiolivro|audio\s?book|audiobook|google\s+play\s+livros?|play\s+books|apple\s+books|skeelo|formato\s+digital|vers[aã]o\s+digital|leitura\s+digital)\b/i;

const PHYSICAL_RE =
  /\b(capa\s+comum|capa\s+dura|brochura|paperback|hardcover|edi[cç][aã]o\s+f[ií]sica|livro\s+f[ií]sico|mang[aá]|hq|quadrinhos|graphic\s+novel)\b/i;

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function getSearchText(result: ShoppingResult): string {
  return [
    result.title,
    result.source,
    result.snippet,
    result.link,
    result.product_link,
    ...(result.extensions ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function extractVolume(title: string): string | null {
  const normalized = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = normalized.match(/\b(?:vol\.?|volume|tomo)\s*(\d{1,3})\b/i);
  return match?.[1] ?? null;
}

function normalizeTitle(title: string): string[] {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:vol\.?|volume|tomo)\s*\d{1,3}\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["manga", "livro", "book", "comic"].includes(word));
}

function titleMatchScore(queryTitle: string, resultTitle = ""): number {
  const queryTokens = normalizeTitle(queryTitle);
  const resultTokens = new Set(normalizeTitle(resultTitle));
  if (queryTokens.length === 0) return 0;
  const matches = queryTokens.filter((token) => resultTokens.has(token)).length;
  return matches / queryTokens.length;
}

export const fetchPrices = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<PriceResult> => {
    const key = process.env.SERPAPI_KEY;
    if (!key) {
      throw new Error("SERPAPI_KEY is not configured");
    }

    // Force physical format in the search query to avoid Kindle results
    const searchQuery = `${data.title} capa comum`;

    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("gl", "br");
    url.searchParams.set("hl", "pt");
    url.searchParams.set("api_key", key);

    // Fetch price from SerpAPI and cover from Google Books in parallel
    const [serpRes, coverUrl] = await Promise.all([
      fetch(url.toString()),
      searchCover(data.title),
    ]);

    if (!serpRes.ok) {
      console.error("SerpApi error", serpRes.status, await serpRes.text());
      return {
        current_price: null,
        original_price: null,
        discount_percent: null,
        price_source: null,
        affiliate_url: null,
        cover_url: coverUrl,
      };
    }
    const json = (await serpRes.json()) as {
      shopping_results?: ShoppingResult[];
    };

    const isMerchantLink = (u?: string) => {
      if (!u) return false;
      try {
        const host = new URL(u).hostname;
        return !/(^|\.)google\.[a-z.]+$/i.test(host);
      } catch {
        return false;
      }
    };

    const physicalResults = (json.shopping_results ?? []).filter((r) => {
      if (r.extracted_price == null && r.price == null) return false;
      const text = getSearchText(r);
      // Drop digital/kindle editions
      if (DIGITAL_RE.test(text)) return false;
      // Drop suspiciously cheap results (likely digital) unless explicitly physical
      const price = r.extracted_price ?? parsePrice(r.price);
      if (price != null && price < 15 && !PHYSICAL_RE.test(text)) return false;
      return true;
    });

    const requestedVolume = extractVolume(data.title);
    const volumeMatches = requestedVolume
      ? physicalResults.filter((r) => extractVolume(r.title ?? "") === requestedVolume)
      : physicalResults;
    const results = volumeMatches.length > 0 ? volumeMatches : physicalResults;

    if (results.length === 0) {
      return {
        current_price: null,
        original_price: null,
        discount_percent: null,
        price_source: null,
        affiliate_url: null,
        cover_url: coverUrl,
      };
    }

    results.sort((a, b) => {
      // Strongly prefer results that explicitly mention physical format
      const physicalA = PHYSICAL_RE.test(getSearchText(a)) ? 1 : 0;
      const physicalB = PHYSICAL_RE.test(getSearchText(b)) ? 1 : 0;
      if (physicalB !== physicalA) return physicalB - physicalA;
      // Then sort by title relevance
      const sa = titleMatchScore(data.title, a.title);
      const sb = titleMatchScore(data.title, b.title);
      if (sb !== sa) return sb - sa;
      // Then by lowest price
      const pa = a.extracted_price ?? parsePrice(a.price) ?? Infinity;
      const pb = b.extracted_price ?? parsePrice(b.price) ?? Infinity;
      return pa - pb;
    });

    const best = results[0];

    const current = best.extracted_price ?? parsePrice(best.price);
    const original = best.extracted_old_price ?? parsePrice(best.old_price);
    const discount =
      original && current && original > current
        ? Math.round(((original - current) / original) * 100)
        : null;

    const merchantUrl =
      (isMerchantLink(best.link) && best.link) ||
      (isMerchantLink(best.product_link) && best.product_link) ||
      `https://www.amazon.com.br/s?k=${encodeURIComponent(data.title)}`;

    // Use high-res cover from Google Books/Open Library; fall back to SerpAPI thumbnail
    const serpApiThumb = (() => {
      const candidates = [
        ...(best.serpapi_thumbnails ?? []),
        best.serpapi_thumbnail,
        ...(best.thumbnails ?? []),
        best.thumbnail,
      ];
      return candidates.find((u) => typeof u === "string" && u.startsWith("http")) ?? null;
    })();

    return {
      current_price: current,
      original_price: original,
      discount_percent: discount,
      price_source: best.source ?? null,
      affiliate_url: merchantUrl,
      cover_url: coverUrl ?? serpApiThumb,
    };
  });
