import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ACCOUNT_SPECIALTIES: Record<string, string> = {
  drdaniel: "Tricologia",
  angelica: "Enfermagem Estética",
  loysby: "Medicina Esportiva",
};

const ACCOUNT_NAMES: Record<string, string> = {
  drdaniel: "Dr. Daniel",
  angelica: "Enf. Angélica",
  loysby: "Loysby",
};

export async function generateInstagramPost(params: {
  account: string;
  topic: string;
  specialty?: string;
  tone?: string;
  includeHashtags?: boolean;
  cfmCompliant?: boolean;
}): Promise<{ content: string; hashtags: string[] }> {
  const specialty = params.specialty || ACCOUNT_SPECIALTIES[params.account] || "Medicina";
  const name = ACCOUNT_NAMES[params.account] || params.account;
  const tone = params.tone || "educational";

  const toneMap: Record<string, string> = {
    educational: "educativo e informativo",
    inspirational: "inspiracional e motivador",
    promotional: "promocional (sem ser apelativo)",
    awareness: "de conscientização",
  };

  const cfmClause = params.cfmCompliant !== false
    ? `\n\nIMPORTANTE - Normas CFM: Não faça promessas de resultados, não use termos sensacionalistas, não faça comparações com outros profissionais, mantenha linguagem ética e profissional conforme Resolução CFM nº 1.974/2011.`
    : "";

  const prompt = `Você é um especialista em marketing médico digital para o Brasil. Crie uma legenda para Instagram para ${name}, especialista em ${specialty}.

Tema do post: ${params.topic}
Tom: ${toneMap[tone] || tone}
${cfmClause}

Crie uma legenda envolvente com:
1. Abertura que chame atenção (primeira linha)
2. Conteúdo de valor (3-4 parágrafos curtos)
3. Call-to-action no final
4. Use quebras de linha para melhor leitura

${params.includeHashtags !== false ? "Depois da legenda, numa linha separada com --- adicione 15-20 hashtags relevantes para o nicho médico e especialidade." : ""}

Retorne APENAS a legenda (e hashtags separadas por ---) sem explicações adicionais.`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parts = text.split("---");
  const content = parts[0].trim();
  const hashtagsRaw = parts[1] ? parts[1].trim() : "";
  const hashtags = hashtagsRaw
    .split(/[\s\n]+/)
    .filter((h) => h.startsWith("#"))
    .map((h) => h.trim());

  logger.info({ account: params.account, topic: params.topic }, "Generated Instagram post");
  return { content, hashtags };
}

export async function generateReelsScript(params: {
  account: string;
  topic: string;
  specialty?: string;
  durationSeconds?: number;
}): Promise<{ content: string; hashtags: string[] }> {
  const specialty = params.specialty || ACCOUNT_SPECIALTIES[params.account] || "Medicina";
  const name = ACCOUNT_NAMES[params.account] || params.account;
  const duration = params.durationSeconds || 45;

  const prompt = `Você é um roteirista especializado em Reels médicos para Instagram no Brasil. Crie um roteiro completo de Reels de ${duration} segundos para ${name}, especialista em ${specialty}.

Tema: ${params.topic}

O roteiro deve incluir:
1. GANCHO (0-5s): Frase de impacto que prenda a atenção
2. DESENVOLVIMENTO (${duration - 20}s): Conteúdo de valor dividido em pontos
3. CONCLUSÃO (5s): Resumo e CTA
4. INDICAÇÕES: Sugestões de texto na tela, transições e música

Normas CFM: Mantenha linguagem ética, sem promessas de resultados.

Formato:
[GANCHO - 0-5s]
...texto do roteiro...

[DESENVOLVIMENTO - 5-${duration - 15}s]  
...texto dividido em tópicos...

[CONCLUSÃO - ${duration - 10}-${duration}s]
...CTA...

[PRODUÇÃO]
- Texto na tela: ...
- Transição: ...
- Música sugerida: ...

---
#hashtag1 #hashtag2 (adicione 10 hashtags relevantes)`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parts = text.split("---");
  const content = parts[0].trim();
  const hashtagsRaw = parts[1] ? parts[1].trim() : "";
  const hashtags = hashtagsRaw
    .split(/[\s\n]+/)
    .filter((h) => h.startsWith("#"))
    .map((h) => h.trim());

  logger.info({ account: params.account, topic: params.topic }, "Generated Reels script");
  return { content, hashtags };
}

export async function analyzeMarketTrends(params: {
  niche: string;
  searchResults: string;
}): Promise<{ analysis: string; opportunities: Array<{ title: string; description: string; opportunity: string; growthPotential: string }> }> {
  const prompt = `Você é um especialista em marketing médico digital no Brasil. Analise as seguintes tendências do mercado médico digital para o nicho: ${params.niche}

Dados coletados:
${params.searchResults}

Com base nesses dados, forneça uma análise em JSON com o seguinte formato:
{
  "analysis": "análise geral em 2-3 parágrafos",
  "opportunities": [
    {
      "title": "título da oportunidade",
      "description": "descrição detalhada",
      "opportunity": "como aproveitar esta oportunidade",
      "growthPotential": "low|medium|high|very_high"
    }
  ]
}

Foque em: tendências do mercado brasileiro, comportamento do consumidor de saúde digital, oportunidades para médicos nas redes sociais.
Retorne APENAS o JSON válido, sem explicações adicionais.`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to parse market analysis JSON");
  }
  return {
    analysis: "Análise indisponível no momento.",
    opportunities: [],
  };
}
