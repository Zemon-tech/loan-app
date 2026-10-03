import { useNetworkState } from 'expo-network';

import { mockNetwork } from './mockQuery';

/** True when the device has no internet. EXPO_PUBLIC_MOCK_NETWORK=offline forces it for review. */
export function useIsOffline(): boolean {
  const state = useNetworkState();
  if (mockNetwork() === 'offline') return true;
  return state.isConnected === false || state.isInternetReachable === false;
}
