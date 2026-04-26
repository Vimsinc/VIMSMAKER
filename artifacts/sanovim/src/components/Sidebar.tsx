import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Sparkles,
  Image,
  BarChart2,
  Send,
  Video,
  TrendingUp,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/content", icon: Sparkles, label: "Conteúdo" },
  { href: "/images", icon: Image, label: "Imagens" },
  { href: "/metrics", icon: BarChart2, label: "Métricas" },
  { href: "/publish", icon: Send, label: "Publicar" },
  { href: "/video", icon: Video, label: "Vídeo" },
  { href: "/market", icon: TrendingUp, label: "Previsões" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-16 md:w-56 flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="hidden md:block overflow-hidden">
          <p className="text-sm font-bold text-foreground tracking-tight leading-tight">SANOVIM</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Marketing Médico</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <div
                data-testid={`nav-${label.toLowerCase()}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="hidden md:block text-sm font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Version */}
      <div className="px-4 py-3 border-t border-sidebar-border hidden md:block">
        <p className="text-[10px] text-muted-foreground">v1.0.0 &bull; IA Médica</p>
      </div>
    </aside>
  );
}
