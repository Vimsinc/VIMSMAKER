import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { Video, Upload, Loader2, Download, Captions, Film, CheckCircle2, Scissors } from "lucide-react";

export default function VideoEditor() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState<string>("");
  const [addCaptions, setAddCaptions] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ downloadUrl: string; filename: string; transcript?: string } | null>(null);
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
      form.append("convertToReels", "true");
      const res = await fetch("/api/video/process", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      toast({ title: "✅ Reel pronto para publicar!" });
    } catch (e: unknown) {
      toast({ title: (e as Error).message || "Erro ao processar vídeo", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Reels" subtitle="Formate seu vídeo para Instagram e TikTok em segundos" />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* How it works */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">Como funciona</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Upload, label: "1. Envie o vídeo", desc: "Qualquer vídeo gravado no celular" },
                { icon: Film, label: "2. Conversão 9:16", desc: "Formato vertical para Reels / TikTok" },
                { icon: Download, label: "3. Baixe e publique", desc: "Pronto para postar diretamente" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="text-center">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upload */}
          {selectedFile ? (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                onClick={() => { setSelectedFile(null); setResult(null); }}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-lg"
              >
                Trocar
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">Arraste o vídeo aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">MP4, MOV, AVI · até 500 MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />

          {/* Options */}
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {/* Trim */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Recorte (opcional)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Início (segundos)</label>
                  <input
                    type="number" min={0} value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Fim (segundos)</label>
                  <input
                    type="text" value={endTime} placeholder="Fim do vídeo"
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            </div>

            {/* Captions */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Captions className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Legendas automáticas</p>
                  <p className="text-xs text-muted-foreground">Transcreve o áudio com IA (Whisper)</p>
                </div>
              </div>
              <button
                onClick={() => setAddCaptions(!addCaptions)}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${addCaptions ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${addCaptions ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          {/* Process button */}
          <button
            onClick={handleProcess}
            disabled={processing || !selectedFile}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando vídeo...</>
              : <><Video className="w-4 h-4" /> Converter para Reels</>
            }
          </button>

          {/* Result */}
          {result && (
            <div className="bg-card border border-green-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Reel pronto!</p>
                  <p className="text-xs text-muted-foreground">Formato 9:16 · pronto para publicar</p>
                </div>
              </div>
              <a
                href={result.downloadUrl}
                download
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" /> Baixar Reel
              </a>
              {result.transcript && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-foreground mb-1.5">Transcrição gerada:</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{result.transcript}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
