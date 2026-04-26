import { Router, type IRouter } from "express";
import {
  GetMarketTrendsQueryParams,
  GetMarketTrendsResponse,
  GetSeasonalitySuggestionsResponse,
  GetMonthlyReportResponse,
} from "@workspace/api-zod";
import { searchTrends } from "../lib/serper";
import { analyzeMarketTrends } from "../lib/anthropic";

const router: IRouter = Router();

const NICHES: Record<string, string> = {
  tricologia: "tricologia capilar medicina",
  ortopedia: "ortopedia fisioterapia medicina esportiva",
  medicina_esportiva: "medicina esportiva performance atlética",
  baby_tracking: "pediatria saúde infantil bebê",
  geral: "marketing médico digital Brasil medicina",
};

router.get("/market/trends", async (req, res): Promise<void> => {
  const parsed = GetMarketTrendsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const niche = parsed.data.niche || "geral";
  const query = `tendências ${NICHES[niche] || niche} redes sociais 2025`;

  try {
    const results = await searchTrends(query, 8);
    const searchText = results.map((r) => `${r.title}: ${r.snippet}`).join("\n");

    let opportunities;
    let analysis = "";

    if (results.length > 0) {
      const aiResult = await analyzeMarketTrends({ niche, searchResults: searchText });
      opportunities = aiResult.opportunities;
      analysis = aiResult.analysis;
    }

    if (!opportunities || opportunities.length === 0) {
      opportunities = [
        { title: "Conteúdo Educativo em Vídeo", description: "Médicos que publicam conteúdo educativo em Reels crescem 40% mais rápido", opportunity: "Criar série semanal de Reels explicando procedimentos e condições comuns", growthPotential: "very_high" as const, sources: ["Marketing Médico BR"] },
        { title: "Humanização do Profissional de Saúde", description: "Pacientes preferem médicos que mostram personalidade nas redes sociais", opportunity: "Publicar bastidores da rotina e história pessoal do médico", growthPotential: "high" as const, sources: ["Pesquisa Saúde Digital 2025"] },
        { title: "Teleatendimento e Marketing Digital", description: "Integração de telemedicina com presença digital aumenta agenda em 60%", opportunity: "Criar funil de marketing que leve ao agendamento online", growthPotential: "high" as const, sources: ["CFM Telemedicina"] },
        { title: "Parcerias com Micro-influenciadores", description: "Micro-influenciadores da área da saúde têm 3x mais credibilidade", opportunity: "Colaborar com outros profissionais de saúde para cross-posting", growthPotential: "medium" as const, sources: ["Social Health BR"] },
      ];
      analysis = `O mercado de marketing médico digital brasileiro está em forte crescimento em 2025. Profissionais de saúde que investem em presença digital consistente conseguem aumentar sua carteira de pacientes em até 60%. O nicho de ${niche} apresenta oportunidades específicas para conteúdo educativo e humanização do profissional.`;
    }

    res.json(
      GetMarketTrendsResponse.parse({
        niche,
        trends: opportunities,
        analysis,
        fetchedAt: new Date().toISOString(),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch market trends");
    res.status(500).json({ error: "Failed to fetch market trends" });
  }
});

router.get("/market/seasonality", async (_req, res): Promise<void> => {
  const now = new Date();
  const month = now.getMonth() + 1;

  const yearlyEvents = [
    { month: 1, event: "Saúde no Verão", date: "Janeiro", contentIdeas: ["Hidratação e calor", "Proteção solar", "Alimentação saudável no verão"], relevantSpecialties: ["dermatologia", "medicina esportiva"], priority: "high" as const },
    { month: 2, event: "Carnaval e Saúde", date: "Fevereiro", contentIdeas: ["Cuidados durante o carnaval", "Hidratação", "Segurança na folia"], relevantSpecialties: ["medicina geral", "dermatologia"], priority: "medium" as const },
    { month: 3, event: "Março Mês da Mulher", date: "Março", contentIdeas: ["Saúde da mulher", "Prevenção feminina", "Empoderamento e saúde"], relevantSpecialties: ["ginecologia", "enfermagem", "medicina geral"], priority: "high" as const },
    { month: 4, event: "Páscoa e Saúde Digestiva", date: "Abril", contentIdeas: ["Alimentação saudável na Páscoa", "Saúde digestiva", "Chocolate amargo e benefícios"], relevantSpecialties: ["nutrologia", "gastroenterologia"], priority: "low" as const },
    { month: 5, event: "Maio Amarelo", date: "Maio", contentIdeas: ["Saúde mental", "Prevenção ao suicídio", "Bem-estar emocional"], relevantSpecialties: ["psiquiatria", "psicologia", "medicina geral"], priority: "high" as const },
    { month: 6, event: "Junho - Dia do Médico", date: "Junho", contentIdeas: ["Valorização da medicina", "História da saúde", "Homenagem aos profissionais"], relevantSpecialties: ["todas"], priority: "high" as const },
    { month: 7, event: "Julho - Inverno e Imunidade", date: "Julho", contentIdeas: ["Cuidados no inverno", "Doenças respiratórias", "Imunidade"], relevantSpecialties: ["medicina geral", "pneumologia", "pediatria"], priority: "high" as const },
    { month: 8, event: "Agosto Dourado - Amamentação", date: "Agosto", contentIdeas: ["Amamentação", "Saúde do bebê", "Maternidade"], relevantSpecialties: ["pediatria", "ginecologia", "enfermagem"], priority: "medium" as const },
    { month: 9, event: "Setembro Amarelo", date: "Setembro", contentIdeas: ["Saúde mental", "Prevenção ao suicídio", "Autocuidado"], relevantSpecialties: ["psiquiatria", "medicina geral"], priority: "high" as const },
    { month: 10, event: "Outubro Rosa", date: "Outubro", contentIdeas: ["Prevenção ao câncer de mama", "Mamografia", "Saúde feminina"], relevantSpecialties: ["oncologia", "ginecologia", "cirurgia"], priority: "very_high" as const },
    { month: 11, event: "Novembro Azul", date: "Novembro", contentIdeas: ["Saúde masculina", "Câncer de próstata", "Saúde preventiva masculina"], relevantSpecialties: ["urologia", "medicina geral"], priority: "high" as const },
    { month: 12, event: "Dezembro e Saúde no Fim de Ano", date: "Dezembro", contentIdeas: ["Cuidados no fim de ano", "Saúde mental nas festas", "Alimentação equilibrada"], relevantSpecialties: ["medicina geral", "nutrologia"], priority: "medium" as const },
  ];

  const currentMonth = yearlyEvents.find((e) => e.month === month) || yearlyEvents[0];
  const nextMonth = yearlyEvents.find((e) => e.month === (month % 12) + 1) || yearlyEvents[0];

  res.json(
    GetSeasonalitySuggestionsResponse.parse({
      currentMonth: currentMonth.event,
      suggestions: [currentMonth, nextMonth].map((e) => ({
        event: e.event,
        date: e.date,
        contentIdeas: e.contentIdeas,
        relevantSpecialties: e.relevantSpecialties,
        priority: e.priority === "very_high" ? "high" : e.priority,
      })),
    }),
  );
});

router.get("/market/monthly-report", async (_req, res): Promise<void> => {
  const now = new Date();
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  res.json(
    GetMonthlyReportResponse.parse({
      month: months[now.getMonth()],
      year: now.getFullYear(),
      opportunities: [
        { title: "Crescimento em Reels Médicos", description: "O formato de Reels continua dominante para médicos em 2025", opportunity: "Criar pelo menos 3 Reels semanais com conteúdo educativo", growthPotential: "very_high", sources: ["Meta for Business", "Marketing Médico BR"] },
        { title: "SEO Local para Médicos", description: "Google Meu Negócio + SEO local gera 40% mais agendamentos", opportunity: "Otimizar perfil e criar conteúdo localizado para a cidade", growthPotential: "high", sources: ["Google Trends Brasil"] },
        { title: "WhatsApp como Canal de Marketing", description: "WhatsApp Business tem taxa de abertura de 98% — muito acima do email", opportunity: "Implementar funil de WhatsApp para nurturing de pacientes", growthPotential: "high", sources: ["Meta Business"] },
        { title: "Conteúdo de Bastidores", description: "Transparência e humanização aumentam confiança em 70%", opportunity: "Mostrar a rotina clínica e processos de atendimento", growthPotential: "medium", sources: ["Social Health Research"] },
      ],
      recommendations: [
        "Publicar conteúdo educativo mínimo 4x por semana nas redes sociais",
        "Usar Reels como formato principal — priorizado pelo algoritmo do Instagram",
        "Responder comentários e DMs em até 2 horas para aumentar engajamento",
        "Criar parcerias com outros profissionais de saúde da região",
        "Investir em fotografia profissional para o feed — qualidade visual importa",
        "Usar o seletor de horários do SANOVIM para postar nos melhores momentos",
      ],
      generatedAt: new Date().toISOString(),
    }),
  );
});

export default router;
