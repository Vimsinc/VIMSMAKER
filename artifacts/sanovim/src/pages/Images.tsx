import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { Image, Upload, Sparkles, Download, Loader2, Zap, Star } from "lucide-react";

type ImageModel = "runware" | "gemini-flash" | "gemini-pro";

const MODEL_OPTIONS: { value: ImageModel; label: string; badge: string; desc: string }[] = [
  { value: "runware",      label: "Runware",     badge: "Padrão",       desc: "Rápido • FLUX Schnell" },
  { value: "gemini-flash", label: "Nano Banana", badge: "Gemini Flash", desc: "Rápido • Google AI" },
  { value: "gemini-pro",   label: "Imagen 3",    badge: "Alta Res.",    desc: "Premium • Google AI" },
];

export default function Images() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("runware");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Descreva a imagem", variant: "destructive" });
      return;
    }
    if (model === "gemini-pro") {
      const ok = window.confirm("Usar Imagen 3 (Gemini Pro) gerará uma imagem de alta qualidade. Confirmar?");
      if (!ok) return;
    }
    setLoading(true);
    try {
      let res, data;
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
      data = await res!.json();
      if (!res!.ok) throw new Error(data.error);
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
      <TopBar title="Gerador de Imagens" subtitle="Runware, Gemini Flash ou Imagen 3" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Modelo de IA</label>
              <div className="grid grid-cols-3 gap-2">
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setModel(opt.value)}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                      model === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {opt.value === "runware" && <Zap className="w-3 h-3 text-yellow-400" />}
                      {opt.value === "gemini-flash" && <Sparkles className="w-3 h-3 text-blue-400" />}
                      {opt.value === "gemini-pro" && <Star className="w-3 h-3 text-purple-400" />}
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${model === opt.value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{opt.badge}</span>
                    <span className="text-[10px] text-muted-foreground mt-1">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição da imagem</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Pessoa sorrindo fazendo exercício na academia, luz natural, fundo colorido vibrante..."
                rows={4}
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="bg-card border border-border rounded-lg p-2.5">
                <p className="font-medium text-foreground">Formato</p>
                <p>1080 × 1350 px</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-2.5">
                <p className="font-medium text-foreground">Motor</p>
                <p>{model === "runware" ? "FLUX via Runware" : model === "gemini-pro" ? "Imagen 3 (Google)" : "Gemini Flash (Google)"}</p>
              </div>
            </div>

            {model === "gemini-pro" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400 font-medium">⚠️ Custo extra — Imagen 3 usa créditos adicionais. Você será avisado antes de confirmar.</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar Imagem</>}
            </button>
          </div>

          {generatedUrl ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <img src={generatedUrl} alt="Imagem gerada" className="w-full object-cover" />
              <div className="p-3">
                <a href={generatedUrl} download="vibemanager-image.jpg" className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                  <Download className="w-4 h-4" /> Baixar Imagem
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-card border-2 border-dashed border-border rounded-xl flex items-center justify-center min-h-64">
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
