import { Stack } from 'expo-router';

/** Entry area: login, OTP, App Lock setup and Unlock (PRD S2, S3, S4). */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      {/* Post-login / lock screens must not be swiped back to. */}
      <Stack.Screen name="app-lock-setup" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="unlock" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}
