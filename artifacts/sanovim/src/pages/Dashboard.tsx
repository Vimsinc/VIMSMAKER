import { Link } from "wouter";
import { Sparkles, TrendingUp, Image, Video, ArrowRight, Zap, History } from "lucide-react";

const quickActions = [
  { href: "/generator", icon: Sparkles, label: "Gerar Conteúdo", desc: "Ideias + carrossel + legenda", color: "text-blue-400" },
  { href: "/trending", icon: TrendingUp, label: "Trending Topics", desc: "O que está viral agora", color: "text-green-400" },
  { href: "/images", icon: Image, label: "Gerar Imagens", desc: "Runware ou Gemini AI", color: "text-purple-400" },
  { href: "/video", icon: Video, label: "Processar Vídeo", desc: "Converter para Reels 9:16", color: "text-orange-400" },
];

export default function Dashboard() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">VibeManager — Conteúdo Viral com IA</p>
      </div>
      <div className="flex-1 p-6 overflow-y-auto space-y-8">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vindo ao VibeManager</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Gere conteúdo viral para Instagram, TikTok e YouTube em segundos com IA.
          </p>
          <Link href="/generator">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
              <Sparkles className="w-4 h-4" />
              Gerar Conteúdo Agora
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(({ href, icon: Icon, label, desc, color }) => (
              <Link key={href} href={href}>
                <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all cursor-pointer group">
                  <Icon className={`w-6 h-6 ${color} mb-3`} />
                  <p className="font-semibold text-foreground text-sm mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-3 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Como Funciona</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Escolha o tema", desc: "Digite um assunto ou escolha um trending topic do momento" },
              { step: "2", title: "Selecione a ideia", desc: "A IA gera 3 ângulos diferentes — você escolhe o melhor" },
              { step: "3", title: "Gere o conteúdo", desc: "Carrossel completo, legenda e hashtags prontos para publicar" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-card border border-border rounded-xl p-5">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center mb-3">{step}</div>
                <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <Link href="/history">
          <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Ver Histórico</p>
                <p className="text-xs text-muted-foreground">Todas as gerações anteriores</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </div>
  );
}
