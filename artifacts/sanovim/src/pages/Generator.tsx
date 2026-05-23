import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { Sparkles, Loader2, ChevronRight, Copy, Check, RotateCcw } from "lucide-react";

type Step = "theme" | "ideas" | "carousel";

interface Idea {
  id: number;
  title: string;
  hook: string;
  angle: string;
  format: string;
  viralScore: number;
}

interface Slide {
  number: number;
  title: string;
  body: string;
  cta?: string;
}

interface CarouselResult {
  slides: Slide[];
  legend: string;
  hashtags: string[];
}

export default function Generator() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("theme");
  const [theme, setTheme] = useState("");
  const [niche, setNiche] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [carousel, setCarousel] = useState<CarouselResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateIdeas = async () => {
    if (!theme.trim()) {
      toast({ title: "Digite o tema do conteúdo", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, niche }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas);
      setStep("ideas");
    } catch (err) {
      console.error("Generate ideas error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao gerar ideias", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIdea = async (idea: Idea) => {
    setSelectedIdea(idea);
    setLoading(true);
    try {
      const res = await fetch("/api/generate/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, niche, idea: idea.title + " — " + idea.angle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCarousel(data);
      setStep("carousel");
    } catch {
      toast({ title: "Erro ao gerar carrossel", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLegend = () => {
    if (!carousel) return;
    const text = carousel.legend + "\n\n" + carousel.hashtags.join(" ");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep("theme");
    setTheme("");
    setNiche("");
    setIdeas([]);
    setSelectedIdea(null);
    setCarousel(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        title="Gerador de Conteúdo"
        subtitle="Ideias virais com IA"
        actions={
          step !== "theme" ? (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-lg transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Recomeçar
            </button>
          ) : undefined
        }
      />

      {/* Steps indicator */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card/50">
        {[
          { key: "theme", label: "1. Tema" },
          { key: "ideas", label: "2. Ideias" },
          { key: "carousel", label: "3. Carrossel" },
        ].map(({ key, label }, i, arr) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${step === key ? "bg-primary text-primary-foreground" : ideas.length > 0 && i <= ["theme","ideas","carousel"].indexOf(step) ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* STEP 1: Theme */}
        {step === "theme" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tema do conteúdo</label>
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Como perder peso sem academia, Receitas saudáveis para o verão, Truques de produtividade..."
                rows={3}
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Seu nicho <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Ex: Personal trainer, Nutricionista, Coach de vida..."
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleGenerateIdeas}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando ideias...</> : <><Sparkles className="w-4 h-4" /> Gerar 3 Ideias com IA</>}
            </button>
          </div>
        )}

        {/* STEP 2: Ideas */}
        {step === "ideas" && !loading && (
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Escolha uma ideia para gerar o carrossel completo:</p>
            {ideas.map((idea) => (
              <button
                key={idea.id}
                onClick={() => handleSelectIdea(idea)}
                className="w-full text-left bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{idea.title}</h3>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full shrink-0 ml-3">{idea.viralScore}% viral</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2"><span className="font-medium text-foreground/70">Hook:</span> {idea.hook}</p>
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/70">Ângulo:</span> {idea.angle}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">{idea.format}</span>
                  <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Selecionar →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {loading && step === "ideas" && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Gerando carrossel...</p>
          </div>
        )}

        {/* STEP 3: Carousel */}
        {step === "carousel" && carousel && (
          <div className="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Slides */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Slides do Carrossel</h3>
              {carousel.slides.map((slide) => (
                <div key={slide.number} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{slide.number}</span>
                    <p className="font-semibold text-foreground text-sm">{slide.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{slide.body}</p>
                  {slide.cta && <p className="text-xs text-primary font-medium mt-2">→ {slide.cta}</p>}
                </div>
              ))}
            </div>

            {/* Legend + Hashtags */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Legenda</h3>
                  <button onClick={copyLegend} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar tudo</>}
                  </button>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{carousel.legend}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Hashtags</h3>
                <div className="flex flex-wrap gap-2">
                  {carousel.hashtags.map((tag) => (
                    <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">{tag}</span>
                  ))}
                </div>
              </div>

              {selectedIdea && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Ideia selecionada</h3>
                  <p className="text-xs text-muted-foreground">{selectedIdea.angle}</p>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded mt-2 inline-block">{selectedIdea.format}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
