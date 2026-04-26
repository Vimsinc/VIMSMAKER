import { useAccount, ACCOUNTS, type AccountName } from "@/context/AccountContext";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function AccountSelector() {
  const { account, accountInfo, setAccount } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const colors: Record<AccountName, string> = {
    drdaniel: "bg-blue-500",
    angelica: "bg-pink-500",
    loysby: "bg-emerald-500",
  };

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="account-selector-button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/50 transition-all text-left"
      >
        <div className={`w-7 h-7 rounded-full ${colors[account]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {accountInfo.initials}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-foreground leading-tight">{accountInfo.displayName}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{accountInfo.specialty}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-popover border border-popover-border rounded-lg shadow-xl z-50 overflow-hidden">
          {ACCOUNTS.map((a) => (
            <button
              key={a.key}
              data-testid={`account-option-${a.key}`}
              onClick={() => { setAccount(a.key); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/10 transition-colors text-left ${a.key === account ? "bg-primary/10" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full ${colors[a.key]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {a.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{a.displayName}</p>
                <p className="text-[11px] text-muted-foreground">{a.specialty}</p>
              </div>
              {a.key === account && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
