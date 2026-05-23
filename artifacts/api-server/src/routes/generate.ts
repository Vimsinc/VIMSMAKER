import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { generationsTable, usersTable } from "@workspace/db/schema";
import { desc, sql, eq } from "drizzle-orm";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /generate/ideas
router.post("/generate/ideas", async (req, res) => {
  const { theme, niche } = req.body as { theme: string; niche?: string };
  if (!theme) return res.status(400).json({ error: "theme obrigatório" });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Você é um especialista em conteúdo viral para redes sociais brasileiras.

Tema: "${theme}"
Nicho: "${niche || "criadores de conteúdo geral"}"

Gere EXATAMENTE 3 ideias de posts virais para Instagram. Responda em JSON válido neste formato:
{
  "ideas": [
    {
      "id": 1,
      "title": "título chamativo do post",
      "hook": "primeira linha que prende atenção",
      "angle": "ângulo/abordagem única",
      "format": "carrossel | reels | foto",
      "viralScore": 85
    }
  ]
}`,
        },
      ],
    });

    const text = (msg.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado");
    const parsed = JSON.parse(jsonMatch[0]);

    await db.insert(generationsTable).values({
      theme,
      niche: niche || null,
      type: "ideas",
      content: JSON.stringify(parsed.ideas),
    });
    await db.update(usersTable).set({ postsUsed: sql`${usersTable.postsUsed} + 1` }).where(eq(usersTable.id, 1));

    return res.json(parsed);
  } catch (err) {
    req.log.error(err, "generate ideas error");
    return res.status(500).json({ error: "Erro ao gerar ideias" });
  }
});

// POST /generate/carousel
router.post("/generate/carousel", async (req, res) => {
  const { theme, niche, idea } = req.body as { theme: string; niche?: string; idea: string };
  if (!theme || !idea) return res.status(400).json({ error: "theme e idea obrigatórios" });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Crie um carrossel completo para Instagram sobre:
Tema: "${theme}"
Nicho: "${niche || "geral"}"
Ideia: "${idea}"

Responda em JSON válido:
{
  "slides": [
    {
      "number": 1,
      "title": "título do slide",
      "body": "texto do slide (max 3 linhas)",
      "cta": "chamada para ação (só no último slide)"
    }
  ],
  "legend": "legenda completa com emojis para o post",
  "hashtags": ["#hashtag1", "#hashtag2"]
}

Use 5 a 8 slides. Último slide sempre com CTA forte.`,
        },
      ],
    });

    const text = (msg.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado");
    const parsed = JSON.parse(jsonMatch[0]);

    await db.insert(generationsTable).values({
      theme,
      niche: niche || null,
      type: "carousel",
      content: JSON.stringify(parsed),
    });
    await db.update(usersTable).set({ postsUsed: sql`${usersTable.postsUsed} + 1` }).where(eq(usersTable.id, 1));

    return res.json(parsed);
  } catch (err) {
    req.log.error(err, "generate carousel error");
    return res.status(500).json({ error: "Erro ao gerar carrossel" });
  }
});

// POST /generate/legend
router.post("/generate/legend", async (req, res) => {
  const { theme, niche, tone } = req.body as { theme: string; niche?: string; tone?: string };
  if (!theme) return res.status(400).json({ error: "theme obrigatório" });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Crie uma legenda viral para Instagram.
Tema: "${theme}"
Nicho: "${niche || "geral"}"
Tom: "${tone || "inspirador e engajador"}"

Responda em JSON:
{
  "legend": "legenda completa com emojis, quebras de linha e CTA no final",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"]
}`,
        },
      ],
    });

    const text = (msg.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado");
    const parsed = JSON.parse(jsonMatch[0]);

    return res.json(parsed);
  } catch (err) {
    req.log.error(err, "generate legend error");
    return res.status(500).json({ error: "Erro ao gerar legenda" });
  }
});

// GET /generate/history
router.get("/generate/history", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(generationsTable)
      .orderBy(desc(generationsTable.createdAt))
      .limit(20);
    return res.json(rows);
  } catch (err) {
    req.log.error(err, "history error");
    return res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

export default router;
