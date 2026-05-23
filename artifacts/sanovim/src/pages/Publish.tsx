import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopBar } from "@/components/TopBar";
import { Instagram, Send, Loader2, CheckCircle, ExternalLink, User } from "lucide-react";

interface InstagramAccount {
  account: string;
  displayName: string;
  specialty: string;
  hasToken: boolean;
  hasUserId: boolean;
}

export default function Publish() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState<{ postId: string; permalink: string } | null>(null);

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((data: InstagramAccount[]) => {
        setAccounts(data);
        if (data.length > 0) setSelectedAccount(data[0].account);
      })
      .catch(() => {});
  }, []);

  const handlePublish = async () => {
    if (!selectedAccount || !imageUrl.trim() || !caption.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    setPublished(null);
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: selectedAccount, imageUrl, caption }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao publicar");
      setPublished(data);
      toast({ title: "Post publicado com sucesso!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao publicar";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Publicar no Instagram" subtitle="Publique seu conteúdo diretamente nas contas configuradas" />
      <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-2xl">

        {/* Account selector */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Conta Instagram
          </p>
          <div className="grid gap-2">
            {accounts.map((acc) => (
              <button
                key={acc.account}
                onClick={() => setSelectedAccount(acc.account)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                  selectedAccount === acc.account
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                  <Instagram className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">{acc.displayName}</p>
                  <p className="text-xs text-muted-foreground">{acc.specialty}</p>
                </div>
                {(!acc.hasToken || !acc.hasUserId) && (
                  <span className="ml-auto text-[10px] text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded-full">
                    sem token
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Image URL */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">URL da Imagem</p>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://... ou /api/images/card-file/..."
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          {imageUrl && (
            <div className="w-full aspect-square max-w-[200px] rounded-lg overflow-hidden border border-border">
              <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Legenda</p>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={6}
            placeholder="Escreva sua legenda aqui, com emojis e hashtags..."
            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{caption.length} caracteres</p>
        </div>

        {/* Publish button */}
        <button
          onClick={handlePublish}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {loading ? "Publicando..." : "Publicar no Instagram"}
        </button>

        {/* Success */}
        {published && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400">Post publicado!</p>
              <p className="text-xs text-muted-foreground">ID: {published.postId}</p>
            </div>
            <a href={published.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
              <ExternalLink className="w-3 h-3" /> Ver
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
