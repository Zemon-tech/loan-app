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
import { fetchRefreshTokens } from '@/features/api/client';
import { logout as logoutEndpoint } from '@/features/api/endpoints';
import { queryClient } from '@/features/api/queryClient';
import { refreshOnce } from '@/features/api/refresh';
import { onSessionExpired } from '@/features/api/sessionEvents';
import { clearTokens, loadRefreshToken, saveTokens } from '@/features/api/tokenStore';

/** Max time the boot check may hold the native splash while it validates a stored session. */
const BOOT_REFRESH_TIMEOUT_MS = 6000;

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
  /** True after the server ended the session (refresh rejected); shows the session-expired screen. */
  sessionExpired: boolean;
  startLogin: (mobile: string) => void;
  /**
   * Live: pass the verify tokens. Mock: call with no args (flag flip).
   * Resolves only AFTER tokens are persisted and the session state is set, so callers never
   * race the route guards. Do not navigate manually afterwards: the guards react to the state.
   */
  completeLogin: (tokens?: LoginTokens) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const live = apiMode() === 'live';
  const [hasSession, setHasSession] = useState(false);
  const [mockLoggedIn, setMockLoggedIn] = useState(false);
  const [mobile, setMobile] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(live);
  const [sessionExpired, setSessionExpired] = useState(false);
  const loggedInRef = useRef(false);

  // Boot: a stored refresh token only means "maybe signed in". Validate it once (single-flight
  // refresh, which also yields the in-memory access token) while the native splash is still up.
  //   ok        -> signed in
  //   rejected  -> tokens already cleared -> signed out
  //   transient / timeout -> keep the session; the first authed request retries the refresh
  // `isBootstrapping` starts as `live`, so mock mode is already false and needs no effect work.
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    (async () => {
      let signedIn = false;
      try {
        const token = await loadRefreshToken();
        if (token) {
          const outcome = await Promise.race([
            refreshOnce(fetchRefreshTokens),
            new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), BOOT_REFRESH_TIMEOUT_MS)),
          ]);
          signedIn = outcome === 'timeout' || outcome.ok || outcome.reason === 'transient';
        }
      } catch {
        signedIn = false;
      }
      if (!cancelled) {
        loggedInRef.current = signedIn;
        setHasSession(signedIn);
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
      // Ignore stray events (e.g. an in-flight request finishing after an intentional logout).
      if (!loggedInRef.current) return;
      loggedInRef.current = false;
      void clearTokens();
      queryClient.clear();
      setHasSession(false);
      setMockLoggedIn(false);
      setSessionExpired(true);
    };
    const unsub = onSessionExpired(() => clearSession.current());
    return unsub;
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      isLoggedIn: live ? hasSession : mockLoggedIn,
      mobile,
      isBootstrapping,
      sessionExpired,
      startLogin: (m: string) => setMobile(m),
      completeLogin: async (tokens?: LoginTokens) => {
        // Persist the refresh token and set the in-memory access token BEFORE flipping state.
        if (live && tokens) {
          await saveTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
        }
        loggedInRef.current = true;
        setSessionExpired(false);
        if (live) setHasSession(true);
        else setMockLoggedIn(true);
      },
      logout: () => {
        loggedInRef.current = false;
        setSessionExpired(false);
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
    [live, hasSession, mockLoggedIn, mobile, isBootstrapping, sessionExpired],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
