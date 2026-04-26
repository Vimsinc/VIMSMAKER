import { useState, useRef } from "react";
import { useProcessVideo, useGetVideoHistory, getGetVideoHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/hooks/use-toast";
import { Video, Upload, Loader2, Download, Clock, Captions, Film } from "lucide-react";

export default function VideoEditor() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [startSeconds, setStartSeconds] = useState(0);
  const [endSeconds, setEndSeconds] = useState<number | undefined>(undefined);
  const [addCaptions, setAddCaptions] = useState(false);
  const [convertToReels, setConvertToReels] = useState(true);
  const [processed, setProcessed] = useState<{ outputUrl: string; duration: number; captions?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processVideo = useProcessVideo();
  const { data: history, isLoading: historyLoading } = useGetVideoHistory(
    { limit: 10 },
    { query: { enabled: showHistory, queryKey: getGetVideoHistoryQueryKey({ limit: 10 }) } }
  );

  const handleProcess = async () => {
    if (!selectedFile) {
      toast({ title: "Selecione um video", variant: "destructive" });
      return;
    }
    try {
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("startSeconds", String(startSeconds));
      if (endSeconds !== undefined) formData.append("endSeconds", String(endSeconds));
      formData.append("addCaptions", String(addCaptions));
      formData.append("convertToReels", String(convertToReels));

      const result = await processVideo.mutateAsync({ data: formData as unknown as { video: File } });
      setProcessed({ outputUrl: result.outputUrl, duration: result.duration, captions: result.captions ?? undefined });
      toast({ title: "Video processado com sucesso!" });
      qc.invalidateQueries({ queryKey: getGetVideoHistoryQueryKey({ limit: 10 }) });
    } catch {
      toast({ title: "Erro ao processar video", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        title="Edicao de Video"
        subtitle="Recorte, legendas e exportacao para Reels"
        actions={
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="w-3.5 h-3.5" /> Historico
          </button>
        }
      />
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: controls */}
          <div className="space-y-5">
            {/* Upload */}
            <div
              data-testid="dropzone-video"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && (f.type.startsWith("video/"))) setSelectedFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Arraste o video ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">MP4, MOV, AVI — max 500MB</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            </div>

            {/* Trim controls */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Film className="w-4 h-4 text-primary" /> Recorte</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Inicio (segundos)</label>
                  <input
                    data-testid="input-start-seconds"
                    type="number"
                    min={0}
                    value={startSeconds}
                    onChange={(e) => setStartSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fim (segundos)</label>
                  <input
                    data-testid="input-end-seconds"
                    type="number"
                    min={1}
                    value={endSeconds ?? ""}
                    onChange={(e) => setEndSeconds(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Auto"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Opcoes</h3>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Captions className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Legendas automaticas (Whisper)</span>
                </div>
                <div
                  data-testid="toggle-captions"
                  onClick={() => setAddCaptions((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${addCaptions ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${addCaptions ? "left-5" : "left-1"}`} />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Converter para Reels (9:16, max 90s)</span>
                </div>
                <div
                  data-testid="toggle-reels"
                  onClick={() => setConvertToReels((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${convertToReels ? "bg-primary" : "bg-muted"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${convertToReels ? "left-5" : "left-1"}`} />
                </div>
              </label>
            </div>

            <button
              data-testid="button-process-video"
              onClick={handleProcess}
              disabled={processVideo.isPending || !selectedFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {processVideo.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Video className="w-4 h-4" /> Processar Video</>}
            </button>
          </div>

          {/* Right: result */}
          <div className="space-y-4">
            {processed ? (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Video className="w-4 h-4" />
                  <p className="text-sm font-semibold text-foreground">Video Processado</p>
                </div>
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Duracao: <span className="text-foreground">{processed.duration.toFixed(1)}s</span></p>
                  <p className="text-xs text-muted-foreground">Formato: <span className="text-foreground">MP4 (Reels 9:16)</span></p>
                </div>
                {processed.captions && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Transcricao</p>
                    <div className="bg-background/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <p className="text-xs text-foreground">{processed.captions}</p>
                    </div>
                  </div>
                )}
                <a
                  href={processed.outputUrl}
                  download="sanovim-video.mp4"
                  data-testid="button-download-video"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Download className="w-4 h-4" /> Baixar Video
                </a>
              </div>
            ) : (
              <div className="bg-card border-2 border-dashed border-border rounded-xl flex items-center justify-center min-h-64">
                <div className="text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Resultado do processamento</p>
                  <p className="text-xs text-muted-foreground mt-1">Selecione um video e clique em processar</p>
                </div>
              </div>
            )}

            {/* History panel */}
            {showHistory && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Historico de Videos</h3>
                {historyLoading ? (
                  <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
                ) : history && history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map((v) => (
                      <div key={v.id} data-testid={`video-history-${v.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-xs text-foreground">{v.originalName}</p>
                          <p className="text-xs text-muted-foreground">{v.duration.toFixed(1)}s &bull; {new Date(v.createdAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <a href={v.outputUrl} download className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">Nenhum video processado</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
