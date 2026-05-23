import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { TrendingUp, Search, Loader2, Zap, RefreshCw } from "lucide-react";

interface Topic {
  title: string;
  snippet: string;
}

const NICHES = ["Fitness", "Nutrição", "Saúde", "Beleza", "Empreendedorismo", "Tecnologia", "Motivação", "Educação"];

export default function Trending() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("Fitness");

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

  const handleNiche = (niche: string) => {
    setSelectedNiche(niche);
    fetchSuggestions(niche);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Trending Topics" subtitle="O que está viral agora no Brasil" />
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Search */}
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

        {/* Niches */}
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

        {/* Results */}
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
      </div>
    </div>
  );
}
