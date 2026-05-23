import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { Video, Upload, Loader2, Download, Captions, Film } from "lucide-react";

export default function VideoEditor() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState<string>("");
  const [addCaptions, setAddCaptions] = useState(false);
  const [convertToReels, setConvertToReels] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ downloadUrl: string; filename: string; transcript?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    if (!selectedFile) {
      toast({ title: "Selecione um vídeo", variant: "destructive" });
      return;
    }
    setProcessing(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("video", selectedFile);
      form.append("startTime", String(startTime));
      if (endTime) form.append("endTime", endTime);
      form.append("addCaptions", String(addCaptions));
      form.append("convertToReels", String(convertToReels));
      const res = await fetch("/api/video/process", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      toast({ title: "Vídeo processado com sucesso!" });
    } catch (e: unknown) {
      toast({ title: (e as Error).message || "Erro ao processar vídeo", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Editor de Vídeo" subtitle="Recorte, legendas e exportação para Reels" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            {/* Upload */}
            {selectedFile ? (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Film className="w-8 h-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 border border-border rounded">Remover</button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium mb-1">Arraste o vídeo ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">MP4, MOV, AVI — max 500MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />

            {/* Trim */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Film className="w-4 h-4" /> Recorte</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Início (segundos)</label>
                  <input type="number" min={0} value={startTime} onChange={(e) => setStartTime(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fim (segundos)</label>
                  <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="Auto"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Opções</p>
              {[
                { label: "Legendas automáticas (Whisper)", icon: Captions, value: addCaptions, set: setAddCaptions },
                { label: "Converter para Reels (9:16, max 90s)", icon: Video, value: convertToReels, set: setConvertToReels },
              ].map(({ label, icon: Icon, value, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{label}</span>
                  </div>
                  <button
                    onClick={() => set(!value)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleProcess}
              disabled={processing || !selectedFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Video className="w-4 h-4" /> Processar Vídeo</>}
            </button>
          </div>

          {/* Result */}
          <div className="bg-card border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 min-h-48">
            {result ? (
              <div className="w-full space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Video className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">Vídeo processado!</p>
                  <p className="text-xs text-muted-foreground">{result.filename}</p>
                </div>
                <a href={result.downloadUrl} download className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Download className="w-4 h-4" /> Baixar Vídeo
                </a>
                {result.transcript && (
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-xs font-medium text-foreground mb-1">Transcrição:</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{result.transcript}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <Video className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Resultado do processamento</p>
                <p className="text-xs text-muted-foreground mt-1">Selecione um vídeo e clique em processar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
