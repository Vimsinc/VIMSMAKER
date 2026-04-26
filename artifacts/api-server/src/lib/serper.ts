import { logger } from "./logger";

const SERPER_API_URL = "https://google.serper.dev/search";

interface SerperResult {
  title: string;
  snippet: string;
  link: string;
  source?: string;
}

interface SerperResponse {
  organic?: SerperResult[];
  news?: SerperResult[];
}

export async function searchTrends(query: string, count = 5): Promise<SerperResult[]> {
  const key = process.env.SERPER_KEY;
  if (!key) {
    logger.warn("SERPER_KEY not configured");
    return [];
  }

  try {
    const resp = await fetch(SERPER_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: count, gl: "br", hl: "pt-br" }),
    });

    if (!resp.ok) {
      logger.error({ status: resp.status }, "Serper API error");
      return [];
    }

    const data = (await resp.json()) as SerperResponse;
    const results = data.organic || data.news || [];
    return results.slice(0, count);
  } catch (err) {
    logger.error({ err }, "Failed to fetch from Serper");
    return [];
  }
}

export async function searchNews(query: string, count = 5): Promise<SerperResult[]> {
  const key = process.env.SERPER_KEY;
  if (!key) return [];

  try {
    const resp = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: count, gl: "br", hl: "pt-br" }),
    });

    if (!resp.ok) return [];
    const data = (await resp.json()) as SerperResponse;
    return (data.news || []).slice(0, count);
  } catch (err) {
    logger.error({ err }, "Failed to fetch news from Serper");
    return [];
  }
}
