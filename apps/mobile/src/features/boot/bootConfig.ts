/**
 * MOCK boot config for the prototype.
 *
 * TODO (S1 boot flow): replace with GET /v1/config and compare the installed version
 * against minSupportedVersion. Then attempt refresh-token rehydration.
 *
 * To preview the blocking screens, set EXPO_PUBLIC_MOCK_BOOT in .env to
 * `maintenance` or `update` (default `ok`), then restart the dev server.
 */
export type BootStatus = 'ok' | 'maintenance' | 'update_required';

export interface BootConfig {
  status: BootStatus;
  maintenance: { expectedBackText: string };
  update: {
    latestVersion: string;
    sizeText: string;
    notes: string[];
  };
}

export async function fetchBootConfig(): Promise<BootConfig> {
  const mock = process.env.EXPO_PUBLIC_MOCK_BOOT;
  const status: BootStatus =
    mock === 'maintenance' ? 'maintenance' : mock === 'update' ? 'update_required' : 'ok';

  return {
    status,
    maintenance: { expectedBackText: 'Expected back online today by 06:30 PM IST' },
    update: {
      latestVersion: '2.4.0',
      sizeText: '~18.4 MB',
      notes: [
        'Enhanced financial ledger accuracy',
        'Critical banking security protocols',
        'Faster offline schedule loading',
      ],
    },
  };
}
