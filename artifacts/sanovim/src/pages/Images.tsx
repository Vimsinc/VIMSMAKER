import { useState, useRef, useEffect } from "react";
import {
  useGenerateImage,
  useGenerateImageGemini,
  useCreateProfessionalCard,
  useGetImageHistory,
  getGetImageHistoryQueryKey,
} from "@workspace/api-client-react";
import { TopBar } from "@/components/TopBar";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/hooks/use-toast";
import { Image, Upload, Sparkles, Download, CreditCard, Clock, Loader2, Zap, Star } from "lucide-react";

type Tab = "generate" | "card" | "history";
type ImageModel = "runware" | "gemini-flash" | "gemini-pro";

const MODEL_OPTIONS: { value: ImageModel; label: string; badge: string; desc: string }[] = [
  { value: "runware",      label: "Runware",       badge: "Padrão",          desc: "Rápido • FLUX Schnell" },
  { value: "gemini-flash", label: "Nano Banana",   badge: "Gemini Flash",    desc: "Rápido • Google AI" },
  { value: "gemini-pro",   label: "Imagen 3",      badge: "Alta Resolução",  desc: "Premium • Google AI" },
];

export default function Images() {
  const { account, accountInfo } = useAccount();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("generate");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("runware");
  const [cardText, setCardText] = useState("");
  const [cardSubtext, setCardSubtext] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile) { setPhotoPreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const generateImage = useGenerateImage();
  const generateGemini = useGenerateImageGemini();
  const createCard = useCreateProfessionalCard();
  const { data: history, isLoading: historyLoading } = useGetImageHistory(
    { account, limit: 20 },
    { query: { enabled: tab === "history", queryKey: getGetImageHistoryQueryKey({ account, limit: 20 }) } }
  );

  const isGenerating = generateImage.isPending || generateGemini.isPending;

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({ title: "Descreva a imagem que deseja gerar", variant: "destructive" });
      return;
    }
    try {
      if (model === "runware") {
        const result = await generateImage.mutateAsync({ data: { prompt, account, width: 1080, height: 1350 } });
        setGeneratedUrl(result.url);
      } else {
        const quality = model === "gemini-pro" ? "pro" : "flash";
        const result = await generateGemini.mutateAsync({ data: { prompt, account, quality } });
        setGeneratedUrl(result.url);
      }
      toast({ title: "Imagem gerada!" });
    } catch {
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
    }
  };

  const handleCreateCard = async () => {
    if (!cardText.trim()) {
      toast({ title: "Informe o texto do card", variant: "destructive" });
      return;
    }
    try {
      const result = await createCard.mutateAsync({
        data: {
          account,
          text: cardText,
          subtext: cardSubtext || undefined,
          description: cardDescription || undefined,
          image: selectedFile || undefined,
        },
      });
      setGeneratedUrl(result.url);
      toast({ title: "Card criado com sucesso!" });
    } catch {
      toast({ title: "Erro ao criar card", variant: "destructive" });
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) setSelectedFile(file);
  };

  const tabs = [
    { key: "generate" as Tab, icon: Sparkles, label: "Gerar Imagem" },
    { key: "card" as Tab, icon: CreditCard, label: "Card Profissional" },
    { key: "history" as Tab, icon: Clock, label: "Historico" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Imagens" subtitle={accountInfo.displayName} />
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => { setTab(key); setGeneratedUrl(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Model selector */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Modelo de IA</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      data-testid={`model-${opt.value}`}
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
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        model === opt.value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{opt.badge}</span>
                      <span className="text-[10px] text-muted-foreground mt-1">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Descricao da imagem</label>
                <textarea
                  data-testid="input-image-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Medico sorrindo em consultorio moderno, luz natural, fundo azul suave"
                  rows={4}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <p className="font-medium text-foreground">Formato</p>
                  <p>1080 x 1350 px</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <p className="font-medium text-foreground">Motor</p>
                  <p>{model === "runware" ? "FLUX via Runware" : model === "gemini-pro" ? "Imagen 3 (Google)" : "Gemini Flash (Google)"}</p>
                </div>
              </div>
              <button
                data-testid="button-generate-image"
                onClick={handleGenerateImage}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar Imagem</>}
              </button>
            </div>

            {generatedUrl && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <img src={generatedUrl} alt="Imagem gerada" className="w-full object-cover" />
                <div className="p-3">
                  <a
                    href={generatedUrl}
                    download="sanovim-image.jpg"
                    data-testid="button-download-image"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Baixar Imagem
                  </a>
                </div>
              </div>
            )}

            {!generatedUrl && (
              <div className="bg-card border-2 border-dashed border-border rounded-xl flex items-center justify-center min-h-48">
                <div className="text-center">
                  <Image className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Previa da imagem gerada</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "card" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Texto principal</label>
                <input
                  data-testid="input-card-text"
                  type="text"
                  value={cardText}
                  onChange={(e) => setCardText(e.target.value)}
                  placeholder="Ex: Tratamento Capilar Avancado"
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Subtitulo (opcional)</label>
                <input
                  data-testid="input-card-subtext"
                  type="text"
                  value={cardSubtext}
                  onChange={(e) => setCardSubtext(e.target.value)}
                  placeholder="Ex: Dr. Daniel - CRM 12345"
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Cenário de fundo (IA)
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">opcional</span>
                </label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Descreva o ambiente gerado por IA ao redor da pessoa — consultório, jardim, clínica moderna, etc. A foto da pessoa é preservada exatamente como enviada.
                </p>
                <textarea
                  data-testid="input-card-description"
                  value={cardDescription}
                  onChange={(e) => setCardDescription(e.target.value)}
                  placeholder="Ex: consultório moderno azul, jardim externo com luz natural, clínica branca minimalista..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Foto do médico (opcional)</label>
                {photoPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={photoPreview} alt="Foto selecionada" className="w-full max-h-52 object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{selectedFile?.name}</p>
                        <p className="text-green-400 text-xs">✓ Foto carregada — será usada como base</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="ml-2 text-white/80 hover:text-white text-xs bg-black/40 rounded px-2 py-1 shrink-0"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    data-testid="dropzone-card-image"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Arraste ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou WEBP</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <button
                data-testid="button-create-card"
                onClick={handleCreateCard}
                disabled={createCard.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createCard.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : <><CreditCard className="w-4 h-4" /> Criar Card 1080x1350</>}
              </button>
            </div>

            {generatedUrl ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <img src={generatedUrl} alt="Card profissional" className="w-full object-cover" />
                <div className="p-3">
                  <a href={generatedUrl} download="card-profissional.jpg" className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                    <Download className="w-4 h-4" /> Baixar Card
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-card border-2 border-dashed border-border rounded-xl flex items-center justify-center min-h-48">
                <div className="text-center">
                  <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Previa do card</p>
                  <p className="text-xs text-muted-foreground">1080 x 1350 px</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {historyLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[0,1,2,3].map((i) => <div key={i} className="aspect-[4/5] bg-card border border-border rounded-lg animate-pulse" />)}
              </div>
            ) : history && history.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {history.map((img) => (
                  <div key={img.id} data-testid={`image-history-${img.id}`} className="bg-card border border-border rounded-lg overflow-hidden group">
                    <div className="aspect-[4/5] bg-muted flex items-center justify-center">
                      {img.url ? (
                        <img src={img.url} alt={img.prompt || ""} className="w-full h-full object-cover" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground">{new Date(img.createdAt).toLocaleDateString("pt-BR")}</p>
                      {img.prompt && <p className="text-xs text-foreground line-clamp-1 mt-0.5">{img.prompt}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma imagem gerada ainda</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
