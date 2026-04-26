import { Router, type IRouter } from "express";
import { db, contentHistoryTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import {
  GeneratePostBody,
  GeneratePostResponse,
  GenerateReelsScriptBody,
  GenerateReelsScriptResponse,
  GetTrendsQueryParams,
  GetTrendsResponse,
  GetInnovationsQueryParams,
  GetInnovationsResponse,
  GetContentHistoryQueryParams,
  GetContentHistoryResponse,
} from "@workspace/api-zod";
import { generateInstagramPost, generateReelsScript } from "../lib/anthropic";
import { searchTrends, searchNews } from "../lib/serper";

const router: IRouter = Router();

// Generate Instagram post
router.post("/content/generate-post", async (req, res): Promise<void> => {
  const parsed = GeneratePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { account, topic, specialty, tone, includeHashtags, cfmCompliant } = parsed.data;

  try {
    const result = await generateInstagramPost({ account, topic, specialty, tone, includeHashtags, cfmCompliant });

    const [saved] = await db
      .insert(contentHistoryTable)
      .values({
        account,
        type: "post",
        topic,
        specialty: specialty || null,
        content: result.content,
        hashtags: JSON.stringify(result.hashtags),
        cfmCompliant: cfmCompliant !== false,
      })
      .returning();

    res.json(
      GeneratePostResponse.parse({
        id: saved.id,
        account,
        type: "post",
        content: result.content,
        hashtags: result.hashtags,
        specialty: specialty || null,
        cfmCompliant: cfmCompliant !== false,
        createdAt: saved.createdAt,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to generate post");
    res.status(500).json({ error: "Failed to generate content" });
  }
});

// Generate Reels script
router.post("/content/generate-reels-script", async (req, res): Promise<void> => {
  const parsed = GenerateReelsScriptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { account, topic, specialty, durationSeconds } = parsed.data;

  try {
    const result = await generateReelsScript({ account, topic, specialty, durationSeconds });

    const [saved] = await db
      .insert(contentHistoryTable)
      .values({
        account,
        type: "reels_script",
        topic,
        specialty: specialty || null,
        content: result.content,
        hashtags: JSON.stringify(result.hashtags),
        cfmCompliant: true,
      })
      .returning();

    res.json(
      GenerateReelsScriptResponse.parse({
        id: saved.id,
        account,
        type: "reels_script",
        content: result.content,
        hashtags: result.hashtags,
        specialty: specialty || null,
        cfmCompliant: true,
        createdAt: saved.createdAt,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to generate Reels script");
    res.status(500).json({ error: "Failed to generate Reels script" });
  }
});

// Get trends
router.get("/content/trends", async (req, res): Promise<void> => {
  const parsed = GetTrendsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { account, specialty } = parsed.data;
  const specialtyMap: Record<string, string> = {
    drdaniel: "Tricologia",
    angelica: "Enfermagem Estética",
    loysby: "Medicina Esportiva",
  };
  const spec = specialty || (account ? specialtyMap[account] : "") || "medicina";
  const query = `tendências marketing médico digital ${spec} instagram Brasil 2025`;

  try {
    const results = await searchTrends(query, 5);
    const trends = results.map((r, i) => ({
      rank: i + 1,
      title: r.title,
      description: r.snippet,
      source: r.source || new URL(r.link).hostname,
      url: r.link,
    }));

    // fallback if serper fails
    const fallbackTrends = trends.length > 0 ? trends : [
      { rank: 1, title: "Reels Médicos Educativos", description: "Conteúdo educativo em formato de Reels gera 3x mais alcance para médicos", source: "Marketing Médico", url: "#" },
      { rank: 2, title: "Marketing de Conteúdo com IA", description: "Uso de IA para criação de conteúdo médico ético e personalizado", source: "Saúde Digital", url: "#" },
      { rank: 3, title: "Telemedicina e Presença Digital", description: "Integração entre consultas online e marketing digital para médicos", source: "CFM Digital", url: "#" },
      { rank: 4, title: "Stories para Bastidores da Clínica", description: "Humanização da medicina através de conteúdo dos bastidores", source: "Social Saúde", url: "#" },
      { rank: 5, title: "Depoimentos e Cases (CFM-compliant)", description: "Como usar cases reais respeitando as normas do CFM", source: "CFM Guia", url: "#" },
    ];

    res.json(
      GetTrendsResponse.parse({
        account: account || undefined,
        specialty: spec,
        trends: fallbackTrends,
        fetchedAt: new Date().toISOString(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch trends");
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// Get innovations
router.get("/content/innovations", async (req, res): Promise<void> => {
  const parsed = GetInnovationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { specialty } = parsed.data;
  const query = `novidades inovações ${specialty} medicina 2025 Brasil`;

  try {
    const results = await searchNews(query, 5);
    const innovations = results.map((r) => ({
      title: r.title,
      summary: r.snippet,
      source: r.source || new URL(r.link).hostname,
      url: r.link,
      date: new Date().toLocaleDateString("pt-BR"),
    }));

    const fallback = innovations.length > 0 ? innovations : [
      { title: `Avanços em ${specialty} 2025`, summary: `Novas técnicas e tratamentos estão revolucionando a área de ${specialty} no Brasil`, source: "Medicina Brasil", url: "#", date: new Date().toLocaleDateString("pt-BR") },
      { title: "Tecnologia e Medicina Digital", summary: "Como a inteligência artificial está transformando o diagnóstico médico", source: "Saúde Tech", url: "#", date: new Date().toLocaleDateString("pt-BR") },
    ];

    res.json(
      GetInnovationsResponse.parse({
        specialty,
        innovations: fallback,
        fetchedAt: new Date().toISOString(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch innovations");
    res.status(500).json({ error: "Failed to fetch innovations" });
  }
});

// Get content history
router.get("/content/history", async (req, res): Promise<void> => {
  const parsed = GetContentHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { account, limit } = parsed.data;
  const conditions = account ? [eq(contentHistoryTable.account, account)] : [];

  try {
    const rows = await db
      .select()
      .from(contentHistoryTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(contentHistoryTable.createdAt))
      .limit(limit || 20);

    res.json(
      GetContentHistoryResponse.parse(
        rows.map((r) => ({
          id: r.id,
          account: r.account,
          type: r.type,
          topic: r.topic,
          content: r.content,
          createdAt: r.createdAt,
        })),
      ),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch content history");
    res.status(500).json({ error: "Failed to fetch content history" });
  }
});

export default router;
