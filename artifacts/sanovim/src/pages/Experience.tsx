import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import {
  Wand2, Loader2, Copy, Check, ChevronLeft, ChevronRight,
  FlaskConical, Globe, Sparkles, Building2, Target, Hash,
} from "lucide-react";

const NICHES = [
  "Medicina", "Saúde", "Nutrição", "Fisioterapia",
  "Fitness", "Beleza", "Empreendedorismo", "Tecnologia",
  "Motivação", "Educação", "Direito", "Finanças", "Outros",
];

const INTENTIONS = [
  { value: "Educar", desc: "Ensinar algo novo ao seguidor" },
  { value: "Engajar", desc: "Gerar comentários e compartilhamentos" },
  { value: "Vender", desc: "Apresentar produto ou serviço" },
  { value: "Inspirar", desc: "Motivar e gerar identificação" },
  { value: "Informar", desc: "Notícia ou dado importante do nicho" },
];

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-600",
];

interface Card {
  id: number;
  angle: string;
  title: string;
  body: string;
  caption: string;
  hashtags: string[];
  source: string | null;
  color: string;
}

interface Slide {
  number: number;
  type: string;
  title: string;
  body: string;
}

interface Carousel {
  title: string;
  slides: Slide[];
  caption: string;
  hashtags: string[];
  scientific: boolean;
}

interface ExperienceResult {
  cards: Card[];
  carousel: Carousel;
  meta: {
    niche: string;
    intention: string;
    theme: string;
    companyName: string | null;
    hasScientificBacking: boolean;
    searchedWeb: boolean;
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

const SLIDE_TYPE_LABELS: Record<string, string> = {
  hook: "🪝 Hook",
  development: "📖 Desenvolvimento",
  insight: "💡 Insight",
  cta: "🎯 CTA",
};

export default function Experience() {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [niche, setNiche] = useState("");
  const [intention, setIntention] = useState("");
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExperienceResult | null>(null);
  const [activeCard, setActiveCard] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleGenerate = async () => {
    if (!niche || !intention || !theme.trim()) {
      toast({ title: "Preencha nicho, intenção e tema", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setActiveSlide(0);
    try {
      const res = await fetch("/api/experience/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, niche, intention, theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      toast({ title: (err as Error).message || "Erro ao gerar conteúdo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        title="Experience"
        subtitle="Conteúdo personalizado com IA, pesquisa web e embasamento científico"
      />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Form */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Conte sobre o seu conteúdo</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Company */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Nome da empresa ou perfil <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Clínica Dr. Silva, @fitnessbrasil..."
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Theme */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  Tema do conteúdo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder="Ex: diabetes tipo 2, emagrecimento, renda extra..."
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Niche */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-3">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                Nicho <span className="text-rose-500">*</span>
                {niche && ["Medicina", "Saúde", "Nutrição", "Fisioterapia"].includes(niche) && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-medium">
                    <FlaskConical className="w-2.5 h-2.5" /> Usará PubMed
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNiche(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      niche === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Intention */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-3">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                Intenção do conteúdo <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {INTENTIONS.map(({ value, desc }) => (
                  <button
                    key={value}
                    onClick={() => setIntention(value)}
                    className={`flex flex-col items-start px-3 py-2.5 rounded-xl text-left border transition-all ${
                      intention === value
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-semibold">{value}</span>
                    <span className="text-[10px] leading-tight mt-0.5 opacity-70">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 pt-1">
              {niche && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                  <Globe className="w-3 h-3" /> Pesquisará tendências web sobre "{niche} {theme}"
                </div>
              )}
              {niche && ["Medicina", "Saúde", "Nutrição", "Fisioterapia"].includes(niche) && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                  <FlaskConical className="w-3 h-3" /> Buscará artigos científicos no PubMed
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !niche || !intention || !theme.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Pesquisando e gerando conteúdo...</>
                : <><Wand2 className="w-4 h-4" /> Gerar 3 Cards + 1 Carrossel</>
              }
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-8">
              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Conteúdo gerado para:</span>
                <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">{result.meta.niche}</span>
                <span className="px-2.5 py-1 bg-violet-500/10 text-violet-600 text-xs font-medium rounded-full">{result.meta.intention}</span>
                {result.meta.hasScientificBacking && (
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-xs font-medium rounded-full flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" /> Embasamento científico
                  </span>
                )}
                {result.meta.searchedWeb && (
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 text-xs font-medium rounded-full flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Tendências web
                  </span>
                )}
              </div>

              {/* 3 Cards */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  3 Cards Individuais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.cards.map((card, i) => (
                    <div
                      key={card.id}
                      onClick={() => setActiveCard(i)}
                      className={`bg-card border rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md ${activeCard === i ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                    >
                      {/* Visual card header */}
                      <div className={`bg-gradient-to-br ${CARD_GRADIENTS[i]} p-5 min-h-[140px] flex flex-col justify-between`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">{card.angle}</span>
                          {card.source && <FlaskConical className="w-3.5 h-3.5 text-white/60" />}
                        </div>
                        <p className="text-white font-bold text-sm leading-snug">{card.title}</p>
                      </div>
                      {/* Card body */}
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">{card.body}</p>
                        {card.source && (
                          <p className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-start gap-1">
                            <FlaskConical className="w-3 h-3 shrink-0 mt-0.5" />
                            {card.source}
                          </p>
                        )}
                        <div className="border-t border-border pt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Legenda</p>
                            <CopyButton text={`${card.caption}\n\n${card.hashtags.join(" ")}`} />
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{card.caption}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {card.hashtags.slice(0, 5).map((h) => (
                              <span key={h} className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{h}</span>
                            ))}
                            {card.hashtags.length > 5 && (
                              <span className="text-[10px] text-muted-foreground">+{card.hashtags.length - 5}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carousel */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  Carrossel com 4 Slides
                  {result.carousel.scientific && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FlaskConical className="w-2.5 h-2.5" /> Científico
                    </span>
                  )}
                </h3>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Slide viewer */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 min-h-[220px] flex flex-col justify-between relative">
                    <div className="flex items-center gap-2 mb-4">
                      {result.carousel.slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlide(idx)}
                          className={`h-1.5 rounded-full transition-all ${idx === activeSlide ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
                        />
                      ))}
                    </div>

                    {result.carousel.slides[activeSlide] && (
                      <div className="flex-1 flex flex-col justify-center">
                        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                          {SLIDE_TYPE_LABELS[result.carousel.slides[activeSlide].type] ?? `Slide ${activeSlide + 1}`}
                        </p>
                        <p className="text-white font-bold text-lg leading-snug mb-3">
                          {result.carousel.slides[activeSlide].title}
                        </p>
                        <p className="text-white/75 text-sm leading-relaxed">
                          {result.carousel.slides[activeSlide].body}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-6">
                      <button
                        onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                        disabled={activeSlide === 0}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4 text-white" />
                      </button>
                      <span className="text-white/50 text-xs">{activeSlide + 1} / {result.carousel.slides.length}</span>
                      <button
                        onClick={() => setActiveSlide(Math.min(result.carousel.slides.length - 1, activeSlide + 1))}
                        disabled={activeSlide === result.carousel.slides.length - 1}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Slide list */}
                  <div className="grid grid-cols-4 border-t border-border divide-x divide-border">
                    {result.carousel.slides.map((slide, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`p-3 text-left transition-colors hover:bg-muted/50 ${idx === activeSlide ? "bg-primary/5 border-t-2 border-t-primary" : ""}`}
                      >
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {SLIDE_TYPE_LABELS[slide.type] ?? `Slide ${idx + 1}`}
                        </p>
                        <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">{slide.title}</p>
                      </button>
                    ))}
                  </div>

                  {/* Caption */}
                  <div className="p-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">Legenda do Carrossel</p>
                      <CopyButton text={`${result.carousel.caption}\n\n${result.carousel.hashtags.join(" ")}`} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                      {result.carousel.caption}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.carousel.hashtags.map((h) => (
                        <span key={h} className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{h}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
