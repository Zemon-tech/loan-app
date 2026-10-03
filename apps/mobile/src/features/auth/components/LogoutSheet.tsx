/**
 * LogoutSheet — "Log out?" confirmation, shared by Profile and Settings.
 *
 * TODO (M-03): POST /v1/auth/logout; clear SecureStore, in-memory tokens and TanStack Query cache.
 */
import { router } from 'expo-router';

import { ConfirmSheet } from '@/components/ui';

import { useSession } from '../session';

export function LogoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { logout } = useSession();

  function onConfirm() {
    onClose();
    logout();
    router.replace('/login');
  }

  return (
    <ConfirmSheet
      visible={visible}
      icon="log-out-outline"
      title="Log out?"
      message="You'll need your mobile number and OTP to sign in again."
      confirmLabel="Log out"
      confirmVariant="danger"
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
