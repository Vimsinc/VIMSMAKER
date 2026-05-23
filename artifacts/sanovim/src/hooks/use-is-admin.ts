import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";

export function useIsAdmin(): boolean {
  const { isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setIsAdmin(false); return; }
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => { setIsAdmin(r.ok); })
      .catch(() => setIsAdmin(false));
  }, [isAuthenticated]);

  return isAdmin;
}
