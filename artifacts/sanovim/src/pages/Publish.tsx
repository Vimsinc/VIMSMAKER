import { useState, useRef } from "react";
import { usePublishPost, useSchedulePost, useGetPublishingHistory, useGetScheduledPosts, useCancelScheduledPost, getGetPublishingHistoryQueryKey, getGetScheduledPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/hooks/use-toast";
import { Send, Calendar, Clock, Upload, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";

type Tab = "publish" | "schedule" | "history" | "scheduled";

export default function Publish() {
  const { account, accountInfo } = useAccount();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("publish");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const publishPost = usePublishPost();
  const schedulePost = useSchedulePost();
  const cancelPost = useCancelScheduledPost();

  const { data: history, isLoading: historyLoading } = useGetPublishingHistory(
    { account, limit: 20 },
    { query: { enabled: tab === "history", queryKey: getGetPublishingHistoryQueryKey({ account, limit: 20 }) } }
  );
  const { data: scheduled, isLoading: scheduledLoading } = useGetScheduledPosts(
    { account },
    { query: { enabled: tab === "scheduled", queryKey: getGetScheduledPostsQueryKey({ account }) } }
  );

  const handlePublish = async () => {
    if (!caption.trim()) {
      toast({ title: "Informe a legenda do post", variant: "destructive" });
      return;
    }
    try {
      const formData = new FormData();
      formData.append("account", account);
      formData.append("caption", caption);
      if (hashtags) formData.append("hashtags", hashtags);
      if (selectedFile) formData.append("image", selectedFile);
      await publishPost.mutateAsync({ data: formData as unknown as { account: typeof account; caption: string } });
      toast({ title: "Post publicado com sucesso!" });
      setCaption(""); setHashtags(""); setSelectedFile(null);
      qc.invalidateQueries({ queryKey: getGetPublishingHistoryQueryKey({ account }) });
    } catch {
      toast({ title: "Erro ao publicar post", variant: "destructive" });
    }
  };

  const handleSchedule = async () => {
    if (!caption.trim() || !scheduledAt) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    try {
      const formData = new FormData();
      formData.append("account", account);
      formData.append("caption", caption);
      formData.append("scheduledAt", new Date(scheduledAt).toISOString());
      if (hashtags) formData.append("hashtags", hashtags);
      if (selectedFile) formData.append("image", selectedFile);
      await schedulePost.mutateAsync({ data: formData as unknown as { account: typeof account; caption: string; scheduledAt: string } });
      toast({ title: "Post agendado com sucesso!" });
      setCaption(""); setHashtags(""); setScheduledAt(""); setSelectedFile(null);
      qc.invalidateQueries({ queryKey: getGetScheduledPostsQueryKey({ account }) });
    } catch {
      toast({ title: "Erro ao agendar post", variant: "destructive" });
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelPost.mutateAsync({ id });
      toast({ title: "Agendamento cancelado" });
      qc.invalidateQueries({ queryKey: getGetScheduledPostsQueryKey({ account }) });
    } catch {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "published": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "published": return "Publicado";
      case "failed": return "Falhou";
      case "pending": return "Agendado";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  const PostForm = ({ onSubmit, isPending, submitLabel }: { onSubmit: () => void; isPending: boolean; submitLabel: string }) => (
    <div className="space-y-4 max-w-2xl">
      <div
        data-testid="dropzone-publish-image"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) setSelectedFile(f); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{selectedFile ? selectedFile.name : "Arraste a imagem ou clique para selecionar"}</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 20MB</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Legenda</label>
        <textarea
          data-testid="input-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escreva a legenda do post..."
          rows={5}
          className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Hashtags</label>
        <input
          data-testid="input-hashtags"
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#tricologia #saudecapilar #medicina"
          className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {tab === "schedule" && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Data e hora</label>
          <input
            data-testid="input-scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      )}

      <button
        data-testid="button-submit-publish"
        onClick={onSubmit}
        disabled={isPending}
        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><Send className="w-4 h-4" />{submitLabel}</>}
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Publicacao" subtitle={accountInfo.displayName} />
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1 w-fit flex-wrap">
          {([
            { key: "publish" as Tab, icon: Send, label: "Publicar Agora" },
            { key: "schedule" as Tab, icon: Calendar, label: "Agendar" },
            { key: "scheduled" as Tab, icon: Clock, label: "Agendados" },
            { key: "history" as Tab, icon: CheckCircle2, label: "Historico" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              data-testid={`tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "publish" && (
          <PostForm onSubmit={handlePublish} isPending={publishPost.isPending} submitLabel="Publicar no Instagram" />
        )}

        {tab === "schedule" && (
          <PostForm onSubmit={handleSchedule} isPending={schedulePost.isPending} submitLabel="Agendar Publicacao" />
        )}

        {tab === "scheduled" && (
          <div className="space-y-3 max-w-2xl">
            {scheduledLoading ? (
              <div className="space-y-3">{[0,1].map((i) => <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />)}</div>
            ) : scheduled && scheduled.length > 0 ? (
              scheduled.map((post) => (
                <div key={post.id} data-testid={`scheduled-post-${post.id}`} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <p className="text-sm font-medium text-foreground">{new Date(post.scheduledAt).toLocaleString("pt-BR")}</p>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p>
                  </div>
                  <button
                    data-testid={`cancel-post-${post.id}`}
                    onClick={() => handleCancel(post.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum post agendado</p>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3 max-w-2xl">
            {historyLoading ? (
              <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />)}</div>
            ) : history && history.length > 0 ? (
              history.map((post) => (
                <div key={post.id} data-testid={`history-post-${post.id}`} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {statusIcon(post.status)}
                      <span className="text-sm font-medium text-foreground">{statusLabel(post.status)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p>
                  {post.instagramPostId && (
                    <p className="text-xs text-primary mt-1">ID: {post.instagramPostId}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma publicacao ainda</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
