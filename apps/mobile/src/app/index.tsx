import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/session';

/**
 * Entry route. Sends the user into the app if logged in, otherwise to login.
 *
 * TODO (S1 boot flow): before this, call GET /v1/config and route to Update Required /
 * Maintenance when needed, and attempt refresh-token rehydration (then app-lock unlock).
 */
export default function Index() {
  const { isLoggedIn } = useSession();
  return <Redirect href={isLoggedIn ? '/loans' : '/login'} />;
}
