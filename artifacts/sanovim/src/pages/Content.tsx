import { useState } from "react";
import { useGeneratePost, useGenerateReelsScript, useGetTrends, useGetContentHistory, getGetTrendsQueryKey, getGetContentHistoryQueryKey } from "@workspace/api-client-react";
import { TopBar } from "@/components/TopBar";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, FileText, TrendingUp, Clock, Copy, Check, Loader2 } from "lucide-react";

type Tab = "post" | "reels" | "trends" | "history";

export default function Content() {
  const { account, accountInfo } = useAccount();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("post");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("educational");
  const [duration, setDuration] = useState(45);
  const [generatedContent, setGeneratedContent] = useState<{ content: string; hashtags?: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePost = useGeneratePost();
  const generateReels = useGenerateReelsScript();
  const { data: trends, isLoading: trendsLoading } = useGetTrends(
    { account, specialty: accountInfo.specialty },
    { query: { enabled: tab === "trends", queryKey: getGetTrendsQueryKey({ account, specialty: accountInfo.specialty }) } }
  );
  const { data: history, isLoading: historyLoading } = useGetContentHistory(
    { account, limit: 20 },
    { query: { enabled: tab === "history", queryKey: getGetContentHistoryQueryKey({ account, limit: 20 }) } }
  );

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Informe o tema do conteudo", variant: "destructive" });
      return;
    }
    try {
      if (tab === "post") {
        const result = await generatePost.mutateAsync({
          data: { account, topic, tone: tone as "educational" | "inspirational" | "promotional" | "awareness", includeHashtags: true, cfmCompliant: true }
        });
        setGeneratedContent({ content: result.content, hashtags: result.hashtags || [] });
      } else {
        const result = await generateReels.mutateAsync({
          data: { account, topic, durationSeconds: duration }
        });
        setGeneratedContent({ content: result.content, hashtags: result.hashtags || [] });
      }
      toast({ title: "Conteudo gerado com sucesso!" });
    } catch {
      toast({ title: "Erro ao gerar conteudo", variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    const text = generatedContent.hashtags?.length
      ? `${generatedContent.content}\n\n${generatedContent.hashtags.join(" ")}`
      : generatedContent.content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: Tab; icon: typeof Sparkles; label: string }[] = [
    { key: "post", icon: FileText, label: "Post" },
    { key: "reels", icon: Sparkles, label: "Roteiro Reels" },
    { key: "trends", icon: TrendingUp, label: "Tendencias" },
    { key: "history", icon: Clock, label: "Historico" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Geracao de Conteudo" subtitle={`Conta: ${accountInfo.displayName}`} />
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => { setTab(key); setGeneratedContent(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Generation forms */}
        {(tab === "post" || tab === "reels") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tema do conteudo</label>
                <textarea
                  data-testid="input-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={tab === "post" ? "Ex: Queda de cabelo em mulheres jovens" : "Ex: 5 dicas para cabelo saudavel"}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
              {tab === "post" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Tom do post</label>
                  <select
                    data-testid="select-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="educational">Educativo</option>
                    <option value="inspirational">Inspiracional</option>
                    <option value="promotional">Promocional</option>
                    <option value="awareness">Conscientizacao</option>
                  </select>
                </div>
              )}
              {tab === "reels" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Duracao: {duration}s</label>
                  <input
                    type="range"
                    min={30}
                    max={60}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>30s</span><span>60s</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-primary">Conteudo gerado em conformidade com normas CFM</p>
              </div>
              <button
                data-testid="button-generate"
                onClick={handleGenerate}
                disabled={generatePost.isPending || generateReels.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {(generatePost.isPending || generateReels.isPending) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Gerar com IA</>
                )}
              </button>
            </div>

            {generatedContent && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Conteudo Gerado</p>
                  <button
                    data-testid="button-copy"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-md text-xs font-medium hover:bg-secondary/80 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed bg-background/50 p-3 rounded-lg">
                    {generatedContent.content}
                  </pre>
                </div>
                {generatedContent.hashtags && generatedContent.hashtags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Hashtags</p>
                    <div className="flex flex-wrap gap-1">
                      {generatedContent.hashtags.map((h, i) => (
                        <span key={i} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Trends */}
        {tab === "trends" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Top 5 tendencias para <strong className="text-foreground">{accountInfo.specialty}</strong></p>
            {trendsLoading ? (
              <div className="space-y-3">
                {[0,1,2,3,4].map((i) => <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {trends?.trends?.map((trend, i) => (
                  <div key={i} data-testid={`trend-item-${i}`} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl font-bold text-primary/60 w-6 shrink-0">#{trend.rank}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">{trend.title}</p>
                        <p className="text-xs text-muted-foreground">{trend.description}</p>
                        {trend.source && <p className="text-xs text-primary mt-1">Fonte: {trend.source}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="space-y-3">
            {historyLoading ? (
              <div className="space-y-3">
                {[0,1,2].map((i) => <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />)}
              </div>
            ) : history && history.length > 0 ? (
              history.map((item) => (
                <div key={item.id} data-testid={`history-item-${item.id}`} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full capitalize">{item.type === "post" ? "Post" : "Reels"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Tema: <span className="text-foreground">{item.topic}</span></p>
                  <p className="text-sm text-foreground line-clamp-2">{item.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum conteudo gerado ainda</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
