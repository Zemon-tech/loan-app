/**
 * Throwaway in-memory session store for the PROTOTYPE only.
 *
 * TODO (M-03): replace with real session management —
 *   - refresh token in expo-secure-store, access token in memory
 *   - rehydrate on boot, refresh single-flight, logout clears SecureStore + query cache
 * This exists purely so the prototype can gate the tabs behind the login flow.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface SessionState {
  isLoggedIn: boolean;
  /** The mobile number entered at login (prototype display only). */
  mobile: string | null;
  startLogin: (mobile: string) => void;
  completeLogin: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobile, setMobile] = useState<string | null>(null);

  const value = useMemo<SessionState>(
    () => ({
      isLoggedIn,
      mobile,
      startLogin: (m: string) => setMobile(m),
      completeLogin: () => setIsLoggedIn(true),
      logout: () => {
        setIsLoggedIn(false);
        setMobile(null);
      },
    }),
    [isLoggedIn, mobile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
