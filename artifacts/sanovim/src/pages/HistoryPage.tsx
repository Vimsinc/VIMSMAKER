import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { History, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface GenRecord {
  id: number;
  theme: string;
  niche: string | null;
  type: string;
  content: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<GenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/generate/history")
      .then((r) => r.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typeLabel = (type: string) => {
    const map: Record<string, string> = { ideas: "Ideias", carousel: "Carrossel", legend: "Legenda" };
    return map[type] || type;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Histórico" subtitle="Todas as gerações anteriores" />
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[0,1,2].map((i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <History className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium text-foreground mb-1">Nenhuma geração ainda</p>
              <p className="text-sm text-muted-foreground">Comece gerando conteúdo na aba Gerar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-card/80 transition-colors"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.theme}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{typeLabel(r.type)}</span>
                        {r.niche && <span className="text-xs text-muted-foreground">{r.niche}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                  {expanded === r.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {expanded === r.id && (
                  <div className="px-5 pb-4 border-t border-border">
                    <pre className="text-xs text-muted-foreground mt-3 whitespace-pre-wrap bg-background rounded-lg p-3 overflow-auto max-h-64">
                      {JSON.stringify(JSON.parse(r.content), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
