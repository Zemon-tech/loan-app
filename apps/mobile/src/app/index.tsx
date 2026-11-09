import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { apiMode } from '@/features/api/config';
import { fetchBootConfig, type BootStatus } from '@/features/boot/bootConfig';
import { useSession } from '@/features/auth/session';
import { useAppTheme } from '@/hooks/use-theme';

/**
 * Anchor route: no UI of its own (the NATIVE splash covers startup). It just sends the user to
 * the right place for the current state. Route guards in the root layout keep it consistent
 * when the session changes (login, logout, expiry).
 *
 * Live mode: there is no /config endpoint (api-guide), so boot status is 'ok'.
 * Mock mode keeps the EXPO_PUBLIC_MOCK_BOOT-driven maintenance/update previews.
 */
export default function Index() {
  const theme = useAppTheme();
  const { isLoggedIn, isBootstrapping, sessionExpired } = useSession();
  const live = apiMode() === 'live';
  const [status, setStatus] = useState<BootStatus | null>(live ? 'ok' : null);

  useEffect(() => {
    if (live) return;
    let cancelled = false;
    fetchBootConfig().then((c) => {
      if (!cancelled) setStatus(c.status);
    });
    return () => {
      cancelled = true;
    };
  }, [live]);

  if (isBootstrapping || status === null) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.canvas }} />;
  }

  if (status === 'maintenance') return <Redirect href="/maintenance" />;
  if (status === 'update_required') return <Redirect href="/update-required" />;
  if (sessionExpired) return <Redirect href="/session-expired" />;
  return <Redirect href={isLoggedIn ? '/loans' : '/login'} />;
}
