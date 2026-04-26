import { useState } from "react";
import { useGetMetricsOverview, useGetAccountMetrics, useGetTopPosts, useGetBestPostingTime, useGetGrowthData, getGetAccountMetricsQueryKey, getGetTopPostsQueryKey, getGetBestPostingTimeQueryKey, getGetGrowthDataQueryKey } from "@workspace/api-client-react";
import { TopBar } from "@/components/TopBar";
import { useAccount, ACCOUNTS } from "@/context/AccountContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, Eye, Heart, Clock, TrendingUp } from "lucide-react";
import type { AccountName } from "@/context/AccountContext";

export default function Metrics() {
  const { account } = useAccount();
  const [selectedTab, setSelectedTab] = useState<AccountName>(account);

  const { data: overview, isLoading: overviewLoading } = useGetMetricsOverview();
  const { data: accountMetrics, isLoading: metricsLoading } = useGetAccountMetrics(
    selectedTab,
    { query: { queryKey: getGetAccountMetricsQueryKey(selectedTab) } }
  );
  const { data: topPosts, isLoading: postsLoading } = useGetTopPosts(
    selectedTab,
    { query: { queryKey: getGetTopPostsQueryKey(selectedTab) } }
  );
  const { data: bestTime } = useGetBestPostingTime(
    selectedTab,
    { query: { queryKey: getGetBestPostingTimeQueryKey(selectedTab) } }
  );
  const { data: growthData, isLoading: growthLoading } = useGetGrowthData(
    selectedTab,
    { query: { queryKey: getGetGrowthDataQueryKey(selectedTab) } }
  );

  const metricCards = accountMetrics ? [
    { label: "Seguidores", value: accountMetrics.followers?.toLocaleString("pt-BR"), icon: Users, color: "text-blue-400" },
    { label: "Alcance 30d", value: accountMetrics.reach30d?.toLocaleString("pt-BR"), icon: Eye, color: "text-emerald-400" },
    { label: "Impressoes 30d", value: accountMetrics.impressions30d?.toLocaleString("pt-BR"), icon: TrendingUp, color: "text-amber-400" },
    { label: "Taxa Eng.", value: `${accountMetrics.engagementRate?.toFixed(2)}%`, icon: Heart, color: "text-pink-400" },
  ] : [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar title="Metricas Instagram" subtitle="Ultimos 30 dias" />
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
        {/* Account tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {ACCOUNTS.map((a) => (
            <button
              key={a.key}
              data-testid={`metrics-tab-${a.key}`}
              onClick={() => setSelectedTab(a.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                selectedTab === a.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.displayName}
            </button>
          ))}
        </div>

        {/* Metric cards */}
        {metricsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0,1,2,3].map((i) => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, "-")}`} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Growth chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Crescimento de Seguidores — 30 dias</h3>
          {growthLoading ? (
            <div className="h-48 bg-muted rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={growthData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="followers" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Seguidores" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top posts */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Posts</h3>
            {postsLoading ? (
              <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
            ) : topPosts && topPosts.length > 0 ? (
              <div className="space-y-3">
                {topPosts.map((post, i) => (
                  <div key={post.id} data-testid={`top-post-${i}`} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                    <span className="text-lg font-bold text-primary/50 w-5 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2 mb-1">{post.caption || "Post sem legenda"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes}</span>
                        <span>{post.engagementRate?.toFixed(1)}% eng.</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum post encontrado</p>
            )}
          </div>

          {/* Best posting times */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Melhores Horarios
            </h3>
            {bestTime?.bestTimes?.map((slot, i) => (
              <div key={i} data-testid={`best-time-${i}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-foreground">{slot.dayOfWeek} — {slot.hour}h</p>
                  <p className="text-xs text-muted-foreground">{slot.recommendation}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{slot.engagementScore?.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
