import { useState } from "react";
import { useGetMarketTrends, useGetSeasonalitySuggestions, useGetMonthlyReport, getGetMarketTrendsQueryKey, getGetSeasonalitySuggestionsQueryKey, getGetMonthlyReportQueryKey } from "@workspace/api-client-react";
import { TopBar } from "@/components/TopBar";
import { TrendingUp, Calendar, FileBarChart, ChevronRight, Zap } from "lucide-react";

type Tab = "trends" | "seasonality" | "report";
type Niche = "geral" | "tricologia" | "ortopedia" | "medicina_esportiva" | "baby_tracking";

const NICHES: { key: Niche; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "tricologia", label: "Tricologia" },
  { key: "ortopedia", label: "Ortopedia" },
  { key: "medicina_esportiva", label: "Med. Esportiva" },
  { key: "baby_tracking", label: "Baby Tracking" },
];

const GROWTH_COLORS: Record<string, string> = {
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  very_high: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const GROWTH_LABELS: Record<string, string> = {
  low: "Baixo",
  medium: "Medio",
  high: "Alto",
  very_high: "Muito Alto",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "border-blue-500/30 bg-blue-500/10",
  medium: "border-amber-500/30 bg-amber-500/10",
  high: "border-emerald-500/30 bg-emerald-500/10",
};

export default function Market() {
  const [tab, setTab] = useState<Tab>("trends");
  const [niche, setNiche] = useState<Niche>("geral");

  const { data: trends, isLoading: trendsLoading } = useGetMarketTrends(
    { niche },
    { query: { queryKey: getGetMarketTrendsQueryKey({ niche }) } }
  );
  const { data: seasonality, isLoading: seasonalityLoading } = useGetSeasonalitySuggestions(
    { query: { enabled: tab === "seasonality", queryKey: getGetSeasonalitySuggestionsQueryKey() } }
  );
  const { data: report, isLoading: reportLoading } = useGetMonthlyReport(
    { query: { enabled: tab === "report", queryKey: getGetMonthlyReportQueryKey() } }
  );

  const tabs = [
    { key: "trends" as Tab, icon: TrendingUp, label: "Tendencias" },
    { key: "seasonality" as Tab, icon: Calendar, label: "Sazonalidade" },
    { key: "report" as Tab, icon: FileBarChart, label: "Relatorio Mensal" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Previsoes de Mercado" subtitle="Mercado medico digital brasileiro" />
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "trends" && (
          <div className="space-y-5">
            {/* Niche selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Filtrar por nicho</p>
              <div className="flex flex-wrap gap-2">
                {NICHES.map(({ key, label }) => (
                  <button
                    key={key}
                    data-testid={`niche-${key}`}
                    onClick={() => setNiche(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      niche === key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {trendsLoading ? (
              <div className="space-y-3">{[0,1,2,3].map((i) => <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />)}</div>
            ) : (
              <>
                {trends?.analysis && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <p className="text-xs font-semibold text-primary mb-1">Analise de Mercado</p>
                    <p className="text-sm text-foreground">{trends.analysis}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {trends?.trends?.map((trend, i) => (
                    <div key={i} data-testid={`market-trend-${i}`} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-foreground">{trend.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${GROWTH_COLORS[trend.growthPotential] || GROWTH_COLORS.medium}`}>
                          {GROWTH_LABELS[trend.growthPotential] || trend.growthPotential}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{trend.description}</p>
                      {trend.opportunity && (
                        <div className="flex items-start gap-2 p-2.5 bg-background/50 rounded-lg">
                          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground">{trend.opportunity}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "seasonality" && (
          <div className="space-y-4">
            {seasonalityLoading ? (
              <div className="space-y-3">{[0,1].map((i) => <div key={i} className="h-40 bg-card border border-border rounded-xl animate-pulse" />)}</div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Mes atual: <strong className="text-foreground">{seasonality?.currentMonth}</strong></p>
                {seasonality?.suggestions?.map((s, i) => (
                  <div key={i} data-testid={`seasonality-${i}`} className={`border rounded-xl p-4 ${PRIORITY_COLORS[s.priority] || "border-border bg-card"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground">{s.event}</h3>
                      <span className="text-xs text-muted-foreground">{s.date}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Ideias de Conteudo:</p>
                      <ul className="space-y-1">
                        {s.contentIdeas?.map((idea, j) => (
                          <li key={j} className="flex items-center gap-2 text-xs text-foreground">
                            <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                            {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "report" && (
          <div className="space-y-5">
            {reportLoading ? (
              <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">
                    Relatorio de {report?.month}/{report?.year}
                  </h2>
                  <span className="text-xs text-muted-foreground">Gerado em {report?.generatedAt ? new Date(report.generatedAt).toLocaleDateString("pt-BR") : ""}</span>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Oportunidades do Mes</h3>
                  <div className="space-y-3">
                    {report?.opportunities?.map((op, i) => (
                      <div key={i} data-testid={`opportunity-${i}`} className="border-l-2 border-primary pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground">{op.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${GROWTH_COLORS[op.growthPotential] || GROWTH_COLORS.medium}`}>
                            {GROWTH_LABELS[op.growthPotential] || op.growthPotential}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{op.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Recomendacoes</h3>
                  <ul className="space-y-2">
                    {report?.recommendations?.map((rec, i) => (
                      <li key={i} data-testid={`recommendation-${i}`} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
