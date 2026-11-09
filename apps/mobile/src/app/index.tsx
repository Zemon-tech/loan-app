import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { apiMode } from '@/features/api/config';
import { SplashView } from '@/features/boot/components/SplashView';
import { fetchBootConfig } from '@/features/boot/bootConfig';
import { useSession } from '@/features/auth/session';

/** Minimum time the splash stays visible so it never flashes. */
const MIN_SPLASH_MS = 1200;

/**
 * S1: Splash / Boot. Minimal, calm, secure-feeling.
 * Routes to one of: Maintenance | Update required | Unlock | My Loans | Login.
 *
 * Live mode: there is no /config endpoint (api-guide) — skip fetchBootConfig() entirely and
 * treat boot status as 'ok', then rehydrate the session (a stored refresh token) before choosing
 * a destination. Mock mode keeps the EXPO_PUBLIC_MOCK_BOOT-driven maintenance/update previews.
 */
export default function SplashScreen() {
  const { isLoggedIn, isBootstrapping } = useSession();
  const [destination, setDestination] = useState<Href | null>(null);

  useEffect(() => {
    // Wait for the session provider's boot rehydration to finish (live mode).
    if (isBootstrapping) return;
    let cancelled = false;

    async function boot() {
      const live = apiMode() === 'live';
      const [status] = await Promise.all([
        // Live mode has no /config endpoint — skip the call and treat status as 'ok'.
        live ? Promise.resolve('ok' as const) : fetchBootConfig().then((c) => c.status),
        new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
      ]);
      if (cancelled) return;

      // Maintenance / update-required only reachable in mock mode (no /config endpoint live).
      if (status === 'maintenance') return setDestination('/maintenance');
      if (status === 'update_required') return setDestination('/update-required');
      if (!isLoggedIn) return setDestination('/login');
      return setDestination('/loans');
    }

    boot();
    return () => {
      cancelled = true;
    };
    // Boot decision runs once rehydration completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapping]);

  // <Redirect> (not router.replace in an effect) avoids an unhandled GO_BACK on the first screen.
  if (destination) return <Redirect href={destination} />;

  return <SplashView />;
}
