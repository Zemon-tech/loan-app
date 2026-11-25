/**
 * LogoutSheet — "Log out?" confirmation, shared by Profile and Settings.
 *
 * TODO (M-03): POST /v1/auth/logout; clear SecureStore, in-memory tokens and TanStack Query cache.
 */

import { useTranslation } from 'react-i18next';

import { ConfirmSheet } from '@/components/ui';

import { useSession } from '../session';

export function LogoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { logout } = useSession();
  const { t } = useTranslation();

  function onConfirm() {
    onClose();
    logout(); // route guards send the user to /login
  }

  return (
    <ConfirmSheet
      visible={visible}
      icon="log-out-outline"
      title={t('logout.title')}
      message={t('logout.message')}
      confirmLabel={t('logout.confirm')}
      confirmVariant="danger"
      onConfirm={onConfirm}
      onCancel={onClose}
    />
  );
}
