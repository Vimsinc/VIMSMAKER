import { createContext, useContext, useState } from "react";

export type AccountName = "drdaniel" | "angelica" | "loysby";

export interface AccountInfo {
  key: AccountName;
  displayName: string;
  specialty: string;
  initials: string;
}

export const ACCOUNTS: AccountInfo[] = [
  { key: "drdaniel", displayName: "Dr. Daniel", specialty: "Tricologia", initials: "DD" },
  { key: "angelica", displayName: "Enf. Angélica", specialty: "Enfermagem Estética", initials: "EA" },
  { key: "loysby", displayName: "Loysby", specialty: "Medicina Esportiva", initials: "LO" },
];

interface AccountContextValue {
  account: AccountName;
  accountInfo: AccountInfo;
  setAccount: (a: AccountName) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountName>("drdaniel");
  const accountInfo = ACCOUNTS.find((a) => a.key === account) || ACCOUNTS[0];
  return (
    <AccountContext.Provider value={{ account, accountInfo, setAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
