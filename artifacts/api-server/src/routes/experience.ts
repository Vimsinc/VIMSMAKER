import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HEALTH_NICHES = ["medicina", "saúde", "saude", "médico", "medico", "nutrição", "nutricao", "fisioterapia"];

function isHealthNiche(niche: string): boolean {
  const n = niche.toLowerCase();
  return HEALTH_NICHES.some((h) => n.includes(h));
}

async function searchSerper(query: string): Promise<string> {
  const key = process.env.SERPER_KEY;
  if (!key) return "";
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${query} viral tendência 2025`, gl: "br", hl: "pt", num: 5 }),
    });
    const data = await res.json() as { organic?: { title: string; snippet: string }[] };
    return (data.organic || [])
      .slice(0, 5)
      .map((r) => `- ${r.title}: ${r.snippet}`)
      .join("\n");
  } catch (err) {
    logger.error({ err }, "Serper search failed");
    return "";
  }
}

async function searchPubMed(query: string): Promise<string> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=3&retmode=json&sort=relevance&datetype=pdat&reldate=730`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
    const ids = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) return "";

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=text`;
    const fetchRes = await fetch(fetchUrl);
    const abstracts = await fetchRes.text();
    return abstracts.slice(0, 3000);
  } catch (err) {
    logger.error({ err }, "PubMed search failed");
    return "";
  }
}

router.post("/experience/generate", async (req, res): Promise<void> => {
  const { companyName, niche, intention, theme } = req.body as {
    companyName: string;
    niche: string;
    intention: string;
    theme: string;
  };

  if (!niche || !intention || !theme) {
    res.status(400).json({ error: "niche, intention e theme são obrigatórios" });
    return;
  }

  try {
    const [serperResults, pubmedResults] = await Promise.all([
      searchSerper(`${theme} ${niche}`),
      isHealthNiche(niche) ? searchPubMed(`${theme} ${niche}`) : Promise.resolve(""),
    ]);

    const hasScientific = pubmedResults.length > 0;

    const systemPrompt = `Você é um especialista em marketing de conteúdo digital para redes sociais brasileiras.
Você cria conteúdo altamente personalizado, viral e adequado ao nicho e à intenção do cliente.
${hasScientific ? "Para nichos de saúde/medicina, você usa embasamento científico real dos artigos fornecidos." : ""}
Sempre responda em JSON válido. Nunca adicione texto fora do JSON.`;

    const userPrompt = `Crie conteúdo personalizado para redes sociais com estas informações:

EMPRESA/PERFIL: ${companyName || "Não informado"}
NICHO: ${niche}
INTENÇÃO: ${intention}
TEMA: ${theme}

${serperResults ? `TENDÊNCIAS ATUAIS SOBRE O TEMA (use como contexto):\n${serperResults}\n` : ""}
${hasScientific ? `ARTIGOS CIENTÍFICOS RECENTES (PubMed) — use para embasamento:\n${pubmedResults}\n` : ""}

Gere EXATAMENTE este JSON:
{
  "cards": [
    {
      "id": 1,
      "angle": "nome do ângulo (ex: Educativo, Provocativo, Emocional)",
      "title": "título do card (máx 8 palavras, chamativo)",
      "body": "texto do card (2-3 frases, direto ao ponto, tom adequado ao nicho)",
      "caption": "legenda completa para Instagram com emojis, quebras de linha, CTA no final",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8"],
      ${hasScientific ? `"source": "referência do estudo científico usado (autor, revista, ano) ou null",` : '"source": null,'}
      "color": "uma cor hex para o card (diferente para cada card)"
    },
    { "id": 2, ... },
    { "id": 3, ... }
  ],
  "carousel": {
    "title": "título geral do carrossel",
    "slides": [
      {
        "number": 1,
        "type": "hook",
        "title": "pergunta provocativa ou afirmação surpreendente",
        "body": "1-2 frases que geram curiosidade"
      },
      {
        "number": 2,
        "type": "development",
        "title": "título do desenvolvimento",
        "body": "2-3 frases explicando o problema ou contexto${hasScientific ? " com dado científico" : ""}"
      },
      {
        "number": 3,
        "type": "insight",
        "title": "a virada / insight",
        "body": "2-3 frases com o insight principal${hasScientific ? " baseado nos estudos" : ""}"
      },
      {
        "number": 4,
        "type": "cta",
        "title": "chamada para ação",
        "body": "CTA forte, diga o que o seguidor deve fazer agora"
      }
    ],
    "caption": "legenda completa para o carrossel com emojis e CTA",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
    ${hasScientific ? '"scientific": true' : '"scientific": false'}
  }
}

IMPORTANTE: 
- Os 3 cards devem ter ângulos diferentes (ex: educativo, emocional, curiosidade)
- Adapte o tom ao nicho: médico = sério e confiável; fitness = energético; beleza = aspiracional; empreendedorismo = prático
- Intenção "${intention}": adapte o CTA e abordagem a esta intenção
- Use as tendências atuais e dados científicos para tornar o conteúdo relevante e atual`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = (msg.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON não encontrado na resposta");
    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      ...parsed,
      meta: {
        niche,
        intention,
        theme,
        companyName: companyName || null,
        hasScientificBacking: hasScientific,
        searchedWeb: serperResults.length > 0,
      },
    });
  } catch (err) {
    req.log.error({ err }, "experience generate error");
    res.status(500).json({ error: "Erro ao gerar conteúdo personalizado" });
  }
});

export default router;
