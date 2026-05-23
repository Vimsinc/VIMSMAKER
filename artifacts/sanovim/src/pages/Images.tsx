import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { Image, Sparkles, Download, Loader2, Zap, Star, Lock } from "lucide-react";

type ImageModel = "runware" | "gemini-flash" | "gemini-pro";

interface ModelOption {
  value: ImageModel;
  label: string;
  badge: string;
  desc: string;
  planRequired: "free" | "essencial" | "premium";
}

const MODEL_OPTIONS: ModelOption[] = [
  { value: "runware",      label: "Runware",     badge: "Grátis",      desc: "FLUX Schnell · Rápido",    planRequired: "free" },
  { value: "gemini-flash", label: "Nano Banana", badge: "Essencial",   desc: "Gemini Flash · Google AI", planRequired: "essencial" },
  { value: "gemini-pro",   label: "Imagen 3",    badge: "Premium",     desc: "Alta resolução · Google",  planRequired: "premium" },
];

const PLAN_ORDER: Record<string, number> = { free: 0, essencial: 1, premium: 2 };

function planLabel(plan: string) {
  const map: Record<string, string> = { free: "Grátis", essencial: "Essencial", premium: "Premium" };
  return map[plan] ?? plan;
}

export default function Images() {
  const { toast } = useToast();
  const [userPlan, setUserPlan] = useState<string>("free");

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.plan) setUserPlan(d.plan); })
      .catch(() => {});
  }, []);

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("runware");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function isLocked(opt: ModelOption) {
    return PLAN_ORDER[userPlan] < PLAN_ORDER[opt.planRequired];
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Descreva a imagem", variant: "destructive" });
      return;
    }
    const selected = MODEL_OPTIONS.find(o => o.value === model)!;
    if (isLocked(selected)) {
      toast({ title: `Plano ${planLabel(selected.planRequired)} necessário`, description: `Faça upgrade para usar ${selected.label}.`, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let res;
      if (model === "runware") {
        res = await fetch("/api/images/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, width: 1080, height: 1350 }),
        });
      } else {
        const quality = model === "gemini-pro" ? "pro" : "flash";
        res = await fetch("/api/images/generate-gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, quality }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedUrl(data.url);
      toast({ title: "Imagem gerada!" });
    } catch (e: unknown) {
      toast({ title: (e as Error).message || "Erro ao gerar imagem", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Gerador de Imagens" subtitle="Runware · Nano Banana · Imagen 3" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Modelo de IA</label>
              <div className="grid grid-cols-3 gap-2">
                {MODEL_OPTIONS.map((opt) => {
                  const locked = isLocked(opt);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !locked && setModel(opt.value)}
                      className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                        locked
                          ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                          : model === opt.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      {locked && (
                        <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {opt.value === "runware" && <Zap className="w-3 h-3 text-yellow-500" />}
                        {opt.value === "gemini-flash" && <Sparkles className="w-3 h-3 text-blue-500" />}
                        {opt.value === "gemini-pro" && <Star className="w-3 h-3 text-purple-500" />}
                        <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium mb-1 ${
                        opt.planRequired === "free" ? "bg-green-100 text-green-700" :
                        opt.planRequired === "essencial" ? "bg-blue-100 text-blue-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>{opt.badge}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição da imagem</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Pessoa sorrindo fazendo exercício na academia, luz natural, fundo colorido vibrante..."
                rows={4}
                className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="bg-muted/40 border border-border rounded-xl p-2.5">
                <p className="font-medium text-foreground mb-0.5">Formato</p>
                <p>1080 × 1350 px</p>
              </div>
              <div className="bg-muted/40 border border-border rounded-xl p-2.5">
                <p className="font-medium text-foreground mb-0.5">Motor</p>
                <p>{model === "runware" ? "FLUX via Runware" : model === "gemini-pro" ? "Imagen 3 (Google)" : "Gemini Flash (Google)"}</p>
              </div>
            </div>

            {model === "gemini-pro" && !isLocked(MODEL_OPTIONS[2]) && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <p className="text-xs text-purple-700 font-medium">Imagen 3 usa créditos adicionais do seu plano Premium.</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar Imagem</>}
            </button>
          </div>

          {generatedUrl ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <img src={generatedUrl} alt="Imagem gerada" className="w-full object-cover" />
              <div className="p-3">
                <a
                  href={generatedUrl}
                  download="vibemanager-image.jpg"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
                >
                  <Download className="w-4 h-4" /> Baixar Imagem
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 border-2 border-dashed border-border rounded-xl flex items-center justify-center min-h-64">
              <div className="text-center">
                <Image className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Prévia da imagem gerada</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
