import { AccountSelector } from "./AccountSelector";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <AccountSelector />
      </div>
    </header>
  );
}
