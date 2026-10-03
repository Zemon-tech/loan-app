/**
 * Throwaway in-memory session store for the PROTOTYPE only.
 *
 * TODO (M-03): replace with real session management —
 *   - refresh token in expo-secure-store, access token in memory
 *   - rehydrate on boot, refresh single-flight, logout clears SecureStore + query cache
 *   - persist `isAppLockEnabled` (SecureStore) and lock on background / cold start
 * This exists purely so the prototype can gate the tabs behind the login flow.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface SessionState {
  isLoggedIn: boolean;
  /** The mobile number entered at login, as `+91XXXXXXXXXX` (prototype display only). */
  mobile: string | null;
  /** User chose to protect the app with biometrics / device authentication. */
  isAppLockEnabled: boolean;
  /** True while the app lock screen must be passed before showing data. */
  isLocked: boolean;
  startLogin: (mobile: string) => void;
  completeLogin: () => void;
  setAppLockEnabled: (enabled: boolean) => void;
  /** Lock the app (App Lock enabled only) after it was in the background. */
  lock: () => void;
  unlock: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobile, setMobile] = useState<string | null>(null);
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const value = useMemo<SessionState>(
    () => ({
      isLoggedIn,
      mobile,
      isAppLockEnabled,
      isLocked,
      startLogin: (m: string) => setMobile(m),
      completeLogin: () => {
        setIsLoggedIn(true);
        setIsLocked(false);
      },
      setAppLockEnabled: (enabled: boolean) => setIsAppLockEnabled(enabled),
      lock: () => setIsLocked(true),
      unlock: () => setIsLocked(false),
      logout: () => {
        setIsLoggedIn(false);
        setIsLocked(false);
        setIsAppLockEnabled(false);
        setMobile(null);
      },
    }),
    [isLoggedIn, mobile, isAppLockEnabled, isLocked],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
