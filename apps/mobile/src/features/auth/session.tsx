/**
 * Session provider — real token management (FR-13, FR-0f) behind the SAME context surface the
 * prototype exposed, so callers change minimally.
 *
 *   - Live mode: `completeLogin(tokens)` persists the refresh token FIRST (single-use), then
 *     flips `hasSession`. Boot rehydrates by reading the stored refresh token (no proactive
 *     refresh — the first authed request refreshes on demand, the sole trigger being a 401 with
 *     Token-Expired: true). `logout()` best-effort hits the logout endpoint, then clears tokens,
 *     and the query cache. A `sessionExpired` event (refresh failed) clears the same.
 *   - Mock mode: `completeLogin()` with no args is the old flag flip; everything else is inert.
 *
 * The access token lives in memory only; the refresh token in SecureStore
 * (WHEN_UNLOCKED_THIS_DEVICE_ONLY). `mobile` is display/masking only, never persisted.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { apiMode } from '@/features/api/config';
import { logout as logoutEndpoint } from '@/features/api/endpoints';
import { queryClient } from '@/features/api/queryClient';
import { onSessionExpired } from '@/features/api/sessionEvents';
import { clearTokens, loadRefreshToken, saveTokens } from '@/features/api/tokenStore';

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
  /** Advisory only — accepted for completeness, DROPPED/unused (FR-0h). */
  expiresInSeconds?: number;
}

interface SessionState {
  isLoggedIn: boolean;
  /** The mobile number entered at login, as `+91XXXXXXXXXX` (display/masking only). */
  mobile: string | null;
  /** True until the boot rehydration (loadRefreshToken) has completed. */
  isBootstrapping: boolean;
  startLogin: (mobile: string) => void;
  /** Live: pass the verify tokens. Mock: call with no args (flag flip). */
  completeLogin: (tokens?: LoginTokens) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const live = apiMode() === 'live';
  const [hasSession, setHasSession] = useState(false);
  const [mockLoggedIn, setMockLoggedIn] = useState(false);
  const [mobile, setMobile] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(live);

  // Boot rehydration: a stored refresh token means "has a session" (no proactive refresh).
  // `isBootstrapping` starts as `live`, so mock mode is already false and needs no effect work.
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    (async () => {
      const token = await loadRefreshToken();
      if (!cancelled) {
        setHasSession(!!token);
        setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live]);

  // Session-expired (refresh failed): clear tokens + cache + mark logged out.
  const clearSession = useRef(() => {});
  useEffect(() => {
    clearSession.current = () => {
      void clearTokens();
      queryClient.clear();
      setHasSession(false);
      setMockLoggedIn(false);
    };
    const unsub = onSessionExpired(() => clearSession.current());
    return unsub;
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      isLoggedIn: live ? hasSession : mockLoggedIn,
      mobile,
      isBootstrapping,
      startLogin: (m: string) => setMobile(m),
      completeLogin: (tokens?: LoginTokens) => {
        if (live) {
          if (tokens) {
            // Persist refresh token first, then mark the session active.
            void saveTokens({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            }).then(() => setHasSession(true));
          } else {
            setHasSession(true);
          }
        } else {
          setMockLoggedIn(true);
        }
      },
      logout: () => {
        if (live) {
          // Best-effort server logout; ignore failure. Then clear local state.
          void logoutEndpoint()
            .catch(() => {})
            .finally(() => {
              void clearTokens();
              queryClient.clear();
            });
        }
        setHasSession(false);
        setMockLoggedIn(false);
        setMobile(null);
      },
    }),
    [live, hasSession, mockLoggedIn, mobile, isBootstrapping],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
