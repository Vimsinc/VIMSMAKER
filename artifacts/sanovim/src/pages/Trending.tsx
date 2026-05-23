import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { TrendingUp, Search, Loader2, Zap, RefreshCw, BarChart2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Topic {
  title: string;
  snippet: string;
}

interface TrendTopic {
  query: string;
  values: { date: string; value: number }[];
  peakValue: number;
  trend: "up" | "down" | "stable";
}

const NICHES = ["Fitness", "Nutrição", "Saúde", "Beleza", "Empreendedorismo", "Tecnologia", "Motivação", "Educação"];

type Tab = "search" | "google";

function MiniSparkline({ values }: { values: { date: string; value: number }[] }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values.map((v) => v.value), 1);
  const w = 80;
  const h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v.value / max) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts.join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
  if (trend === "down") return <ArrowDownRight className="w-4 h-4 text-rose-400" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function TrendBadge({ trend }: { trend: "up" | "down" | "stable" }) {
  const map = {
    up: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    down: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    stable: "bg-muted/30 text-muted-foreground border-border",
  };
  const label = { up: "Em alta", down: "Caindo", stable: "Estável" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${map[trend]}`}>
      <TrendIcon trend={trend} />
      {label[trend]}
    </span>
  );
}

export default function Trending() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("search");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [googleTopics, setGoogleTopics] = useState<TrendTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("Fitness");
  const [googleKeyword, setGoogleKeyword] = useState("");

  const fetchSuggestions = async (niche: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trending/suggestions?niche=${encodeURIComponent(niche)}`);
      const data = await res.json();
      setTopics(data.topics || []);
    } catch {
      toast({ title: "Erro ao buscar trending topics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const searchTopics = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trending/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setTopics(data.topics || []);
    } catch {
      toast({ title: "Erro na pesquisa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleTrends = async (kw?: string) => {
    const keyword = kw ?? googleKeyword;
    if (!keyword.trim()) {
      toast({ title: "Digite uma palavra-chave", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/trending/google-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGoogleTopics(data.topics || []);
      if ((data.topics || []).length === 0) {
        toast({ title: "Nenhum dado encontrado para essa palavra-chave" });
      }
    } catch {
      toast({ title: "Erro ao buscar tendências", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNiche = (niche: string) => {
    setSelectedNiche(niche);
    fetchSuggestions(niche);
  };

  const handleNicheGoogleTrends = (niche: string) => {
    setGoogleKeyword(niche);
    fetchGoogleTrends(niche);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Trending Topics" subtitle="O que está viral agora no Brasil" />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-card border border-border rounded-xl w-fit">
          <button
            onClick={() => setTab("search")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "search" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="w-4 h-4" /> Pesquisa Web
          </button>
          <button
            onClick={() => setTab("google")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "google" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Volume de Busca
          </button>
        </div>

        {/* ── TAB: PESQUISA WEB ── */}
        {tab === "search" && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchTopics()}
                placeholder="Pesquisar trending topics..."
                className="flex-1 px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={searchTopics}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Explorar por nicho:</p>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleNiche(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedNiche === n && topics.length > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => fetchSuggestions(selectedNiche)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Atualizar
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Buscando trending topics...</p>
              </div>
            ) : topics.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{topics.length} tópicos encontrados</p>
                {topics.map((topic, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm mb-1">{topic.title}</p>
                        {topic.snippet && <p className="text-xs text-muted-foreground leading-relaxed">{topic.snippet}</p>}
                      </div>
                      <a
                        href={`/generator?theme=${encodeURIComponent(topic.title)}`}
                        className="ml-auto shrink-0 flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80"
                      >
                        <Zap className="w-3 h-3" /> Gerar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium mb-1">Escolha um nicho ou pesquise</p>
                  <p className="text-sm text-muted-foreground">Veja o que está em alta no Brasil agora</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: GOOGLE TRENDS ── */}
        {tab === "google" && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={googleKeyword}
                onChange={(e) => setGoogleKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchGoogleTrends()}
                placeholder="Ex: marketing digital, emagrecimento, renda extra..."
                className="flex-1 px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => fetchGoogleTrends()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                Buscar
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Nichos populares:</p>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleNicheGoogleTrends(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      googleKeyword === n && googleTopics.length > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Consultando volume de buscas...</p>
              </div>
            ) : googleTopics.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{googleTopics.length} termos em alta encontrados</p>
                {googleTopics.map((topic, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-foreground text-sm">{topic.query}</p>
                          <TrendBadge trend={topic.trend} />
                          {topic.peakValue > 0 && (
                            <span className="text-[11px] text-muted-foreground">pico: {topic.peakValue}</span>
                          )}
                        </div>
                        <MiniSparkline values={topic.values} />
                      </div>
                      <a
                        href={`/generator?theme=${encodeURIComponent(topic.query)}`}
                        className="shrink-0 flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80"
                      >
                        <Zap className="w-3 h-3" /> Gerar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center">
                  <BarChart2 className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium mb-1">Pesquise volume de buscas</p>
                  <p className="text-sm text-muted-foreground">Veja o interesse real de qualquer tema no Brasil</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
