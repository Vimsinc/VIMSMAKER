import { useGetMetricsOverview } from "@workspace/api-client-react";
import { TopBar } from "@/components/TopBar";
import { Activity, Users, Eye, TrendingUp, Sparkles, Image, Send, Video } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: overview, isLoading } = useGetMetricsOverview();

  const modules = [
    { href: "/content", icon: Sparkles, label: "Geração de Conteúdo", desc: "Posts e Reels com IA Claude" },
    { href: "/images", icon: Image, label: "Imagens", desc: "Gerar cards e imagens profissionais" },
    { href: "/metrics", icon: TrendingUp, label: "Métricas", desc: "Analytics das 3 contas Instagram" },
    { href: "/publish", icon: Send, label: "Publicação", desc: "Publicar e agendar posts" },
    { href: "/video", icon: Video, label: "Edição de Vídeo", desc: "Cortar, legendar e exportar Reels" },
    { href: "/market", icon: Activity, label: "Previsões de Mercado", desc: "Tendências do mercado médico" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Dashboard" subtitle="Visao geral da plataforma" />
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
        {/* Metrics overview */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo das Contas</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {overview?.accounts?.map((acc) => (
                <div
                  key={acc.account}
                  data-testid={`account-card-${acc.account}`}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{acc.displayName}</p>
                      <p className="text-xs text-muted-foreground">{acc.specialty}</p>
                    </div>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      +{acc.followersGrowth?.toFixed(1) ?? "0"}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Seguidores</p>
                      <p className="text-lg font-bold text-foreground">{acc.followers?.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> Alcance 30d</p>
                      <p className="text-lg font-bold text-foreground">{acc.reach30d?.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modules grid */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modulos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(({ href, icon: Icon, label, desc }) => (
              <Link key={href} href={href}>
                <div
                  data-testid={`module-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/30 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
