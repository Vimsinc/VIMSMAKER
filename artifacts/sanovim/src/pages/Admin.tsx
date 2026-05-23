import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import {
  Users,
  FileText,
  Image,
  Video,
  Instagram,
  TrendingUp,
  Star,
  Calendar,
  RefreshCw,
} from "lucide-react";

interface AdminStats {
  users: {
    total: number;
    newThisMonth: number;
    newThisWeek: number;
    recent: {
      id: number;
      email: string;
      name: string;
      plan: string;
      postsUsed: number;
      createdAt: string;
    }[];
    timeline: { day: string; total: number }[];
  };
  content: {
    generationsTotal: number;
    imagesTotal: number;
    videosTotal: number;
    publishingTotal: number;
    toolUsage: { tool: string; count: number }[];
    breakdown: { tool: string; count: number; source: string }[];
    mostUsed: string;
  };
}

const TOOL_LABELS: Record<string, string> = {
  ideas: "Ideias",
  carousel: "Carrossel",
  legend: "Legenda",
  hashtags: "Hashtags",
  imagem: "Imagens",
  vídeo: "Vídeos",
  instagram: "Instagram",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-300",
  essencial: "bg-blue-900 text-blue-300",
  premium: "bg-amber-900 text-amber-300",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ${color.replace("text-", "bg-").replace("primary", "primary/10")}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{TOOL_LABELS[label] ?? label}</span>
        <span>{count}</span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (res.status === 403) { setError("Acesso negado — conta sem permissão de admin."); return; }
      if (!res.ok) throw new Error("Erro ao carregar stats");
      setStats(await res.json());
    } catch {
      setError("Falha ao carregar painel admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }
  if (!stats) return null;

  const allBreakdown = stats.content.breakdown;
  const maxCount = Math.max(...allBreakdown.map((b) => b.count), 1);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar
        title="Painel Admin"
        subtitle="Métricas gerais da plataforma"
        actions={
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total de Clientes" value={stats.users.total} />
          <StatCard
            icon={Calendar}
            label="Novos este mês"
            value={stats.users.newThisMonth}
            sub={`+${stats.users.newThisWeek} esta semana`}
            color="text-emerald-400"
          />
          <StatCard
            icon={Image}
            label="Imagens Geradas"
            value={stats.content.imagesTotal}
            color="text-purple-400"
          />
          <StatCard
            icon={Video}
            label="Vídeos Processados"
            value={stats.content.videosTotal}
            color="text-blue-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool usage */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Uso por Ferramenta
              </p>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                Mais usado: {TOOL_LABELS[stats.content.mostUsed] ?? stats.content.mostUsed}
              </span>
            </div>
            <div className="space-y-3">
              {allBreakdown
                .filter((b) => b.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((b) => (
                  <MiniBar key={b.tool} label={b.tool} count={b.count} max={maxCount} />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats.content.generationsTotal}</p>
                <p className="text-[10px] text-muted-foreground">Gerações IA</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats.content.imagesTotal}</p>
                <p className="text-[10px] text-muted-foreground">Imagens</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats.content.publishingTotal}</p>
                <p className="text-[10px] text-muted-foreground">Publicações</p>
              </div>
            </div>
          </div>

          {/* New users timeline */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Novos Clientes — Últimos 30 dias
            </p>
            {stats.users.timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum novo cliente neste período.</p>
            ) : (
              <div className="flex items-end gap-1 h-24">
                {(() => {
                  const maxT = Math.max(...stats.users.timeline.map((d) => d.total), 1);
                  return stats.users.timeline.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full bg-primary/60 hover:bg-primary rounded-sm transition-colors"
                        style={{ height: `${Math.max(4, (d.total / maxT) * 96)}px` }}
                        title={`${d.day}: ${d.total}`}
                      />
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Recent users table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-semibold text-foreground">Clientes Recentes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Nome / E-mail</th>
                  <th className="text-left px-4 py-3 font-medium">Plano</th>
                  <th className="text-right px-4 py-3 font-medium">Posts</th>
                  <th className="text-right px-5 py-3 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.recent.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-sidebar-accent/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[u.plan] ?? "bg-zinc-700 text-zinc-300"}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{u.postsUsed}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {stats.users.recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-muted-foreground text-sm">
                      Nenhum cliente cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
