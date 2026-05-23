import { Router } from "express";
import { searchTrends } from "../lib/serper";
import { db } from "@workspace/db";
import { trendingCacheTable } from "@workspace/db/schema";
import { desc, gte } from "drizzle-orm";

const router = Router();

router.get("/trending/suggestions", async (req, res) => {
  const niche = (req.query.niche as string) || "criadores de conteudo";
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cached = await db
      .select()
      .from(trendingCacheTable)
      .where(gte(trendingCacheTable.fetchedAt, oneHourAgo))
      .orderBy(desc(trendingCacheTable.fetchedAt))
      .limit(1);

    if (cached.length > 0) {
      return res.json({ topics: JSON.parse(cached[0].topics), cached: true });
    }

    const results = await searchTrends(`trending topics ${niche} brasil 2025 viral instagram`);
    const topics = results.slice(0, 10).map((r: { title: string; snippet?: string }) => ({
      title: r.title,
      snippet: r.snippet || "",
    }));

    await db.insert(trendingCacheTable).values({
      niche,
      topics: JSON.stringify(topics),
    });

    return res.json({ topics, cached: false });
  } catch (err) {
    req.log.error(err, "trending suggestions error");
    return res.status(500).json({ error: "Erro ao buscar trending topics" });
  }
});

router.post("/trending/search", async (req, res) => {
  const { query } = req.body as { query: string };
  if (!query) return res.status(400).json({ error: "query obrigatório" });
  try {
    const results = await searchTrends(`${query} viral brasil instagram 2025`);
    const topics = results.slice(0, 8).map((r: { title: string; snippet?: string }) => ({
      title: r.title,
      snippet: r.snippet || "",
    }));
    return res.json({ topics });
  } catch (err) {
    req.log.error(err, "trending search error");
    return res.status(500).json({ error: "Erro na pesquisa" });
  }
});

export default router;
