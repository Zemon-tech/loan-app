import { Stack } from 'expo-router';

/** Entry area: login, OTP, App Lock setup and Unlock (PRD S2, S3, S4). */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      {/* Post-login / lock screens must not be swiped back to. */}
      <Stack.Screen name="app-lock-setup" options={{ gestureEnabled: false }} />
      <Stack.Screen name="unlock" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
